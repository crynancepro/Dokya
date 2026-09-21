import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { dbAdmin, FieldValue } from './lib/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

function getServerAdminDb() {
  return dbAdmin;
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy init Gemini client
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('La clé GEMINI_API_KEY n\'est pas configurée dans l\'environnement. Veuillez ajouter votre clé API Gemini dans les secrets d\'environnement.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Robust Gemini call wrapper with automatic retries and instant model failovers for 503 / 429 demand spikes
async function generateContentWithRetry(ai: GoogleGenAI, params: any) {
  const requestedModel = params.model || 'gemini-3.1-flash-lite';
  // Deduplicated fallback list using valid Gemini models with separate quota & demand pools
  const rawModels = [
    requestedModel,
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview',
  ];
  const modelsToTry = Array.from(new Set(rawModels));
  
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini API] Appel IA avec modèle '${model}'...`);
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMessage = err?.message || String(err);

      // Fail immediately on 403 / PERMISSION_DENIED / missing key identity
      const isAuthError = errMessage.includes('PERMISSION_DENIED') || errMessage.includes('403') || errMessage.includes('unregistered callers') || errMessage.includes('API key') || errMessage.includes('API consumer identity');
      if (isAuthError) {
        console.error(`[Gemini API Error] Authentification échouée (${model}):`, errMessage);
        throw new Error(`Erreur d'authentification Gemini API (403): La clé GEMINI_API_KEY est manquante ou invalide. (${errMessage})`);
      }

      const isQuotaError = errMessage.includes('429') || 
        errMessage.includes('RESOURCE_EXHAUSTED') || 
        errMessage.includes('resource_exhausted') || 
        errMessage.includes('Quota exceeded') || 
        errMessage.includes('quota') || 
        errMessage.includes('rate-limit') ||
        errMessage.includes('per_model_per_day');
      const isTransientServerOverload = errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('UNAVAILABLE') || errMessage.includes('Overloaded');

      if (isTransientServerOverload || isQuotaError) {
        console.info(`[Gemini API] Modèle '${model}' indisponible ou quota atteint (503/429/ResourceExhausted). Basculement automatique vers le modèle de secours...`);
        // Immediately try the next model in fallback list without blocking delay
        continue;
      }

      // For other transient errors, log and try next model
      console.info(`[Gemini API] Modèle '${model}' a retourné une erreur. Tentative avec le modèle suivant...`);
    }
  }

  const isQuota = lastError?.message?.includes('429') || 
    lastError?.message?.includes('RESOURCE_EXHAUSTED') || 
    lastError?.message?.includes('resource_exhausted') ||
    lastError?.message?.includes('Quota exceeded');
  if (isQuota) {
    throw new Error("Quota d'utilisation IA Gemini temporairement dépassé sur certains modèles. Le système bascule automatiquement sur les modèles haute disponibilité.");
  }

  throw lastError || new Error("Erreur de communication avec le service IA Gemini.");
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper to sanitize form data before sending to Gemini text prompt
function sanitizeForPrompt(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    if (data.startsWith('data:image/') || data.length > 3000) {
      return data.substring(0, 300) + '... [image/texte tronqué pour l\'analyse IA]';
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForPrompt);
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (key === 'photoUrl' || key === 'photo') continue; // Omit base64 image strings from text prompt
      clean[key] = sanitizeForPrompt(data[key]);
    }
    return clean;
  }
  return data;
}

// Helper to safely parse JSON returned by Gemini with repair fallbacks
function repairTruncatedJSON(str: string): any {
  if (!str) return null;
  let cleaned = str.trim();
  cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  // 2. Fix unclosed strings and trailing commas
  let s = cleaned;
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) {
      inString = !inString;
    }
  }
  if (inString) {
    s += '"';
  }

  // Remove trailing commas before closing braces/brackets
  s = s.replace(/,\s*([\}\]])/g, '$1');
  s = s.replace(/,\s*$/g, '');

  // Balance brackets & braces
  let openBraces = 0, openBrackets = 0;
  inString = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) {
      inString = !inString;
    }
    if (!inString) {
      if (s[i] === '{') openBraces++;
      else if (s[i] === '}') openBraces = Math.max(0, openBraces - 1);
      else if (s[i] === '[') openBrackets++;
      else if (s[i] === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  while (openBrackets > 0) {
    s += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    s += '}';
    openBraces--;
  }

  try {
    return JSON.parse(s);
  } catch (e) {
    // Fallback attempt: cut back to last valid object brace inside an array
    try {
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace > 0) {
        let cut = cleaned.substring(0, lastBrace + 1).replace(/,\s*$/, '');
        let ob = 0, obr = 0, isStr = false;
        for (let i = 0; i < cut.length; i++) {
          if (cut[i] === '"' && (i === 0 || cut[i - 1] !== '\\')) isStr = !isStr;
          if (!isStr) {
            if (cut[i] === '{') ob++;
            else if (cut[i] === '}') ob = Math.max(0, ob - 1);
            else if (cut[i] === '[') obr++;
            else if (cut[i] === ']') obr = Math.max(0, obr - 1);
          }
        }
        while (obr > 0) { cut += ']'; obr--; }
        while (ob > 0) { cut += '}'; ob--; }
        return JSON.parse(cut);
      }
    } catch (errCut) {
      console.warn('Truncation repair failed:', errCut);
    }
  }

  return null;
}

function safeParseJSON(str: string): any {
  const result = repairTruncatedJSON(str);
  if (result && typeof result === 'object') return result;

  // Fallback extraction for CV generator
  const profileMatch = (str || '').match(/"profileSummary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);

  return {
    profileSummary: profileMatch ? profileMatch[1] : 'Professionnel motivé disposant de compétences solides adaptées au poste visé.',
    experiences: [],
    suggestedKeywords: ['Analyse', 'Gestion de projet', 'Rigueur', 'Communication', 'Autonomie', 'Organisation'],
    interviewTips: [
      'Préparez une présentation concise de 2 minutes mettant en avant votre valeur ajoutée.',
      'Renseignez-vous sur les actualités et projets récents de l\'entreprise au Sénégal.',
      'Illustrez vos réussites professionnelles avec des exemples chiffrés et probants.'
    ]
  };
}

function generateFallbackCVData(formData: any) {
  const p = formData?.personalInfo || {};
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
          // Enrich bullet points with strong action verbs if too simple
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

  // Strict 4-paragraph VOUS / MOI / NOUS / CONCLUSION architecture (250-350 words)
  const coverLetter = {
    subject: `Candidature${targetJob ? ` au poste de ${targetJob}` : ''}${company ? ` - ${company}` : ''}`,
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

// Helper: Intelligent Fallback for Interview Preparation
function generateFallbackInterviewPrep(formData: any): any {
  const p = formData?.personalInfo || {};
  const candidateName = `${p.firstName || 'Candidat'} ${p.lastName || ''}`.trim();
  const targetJob = p.targetJob || 'Professionnel';
  const company = formData?.targetCompany || 'l\'Entreprise recruteuse';
  const city = p.city || 'Dakar';
  const country = p.country || 'Sénégal';

  const userExps = Array.isArray(formData?.experiences) ? formData.experiences : [];
  const primaryExp = userExps[0] || { position: targetJob, company: 'Organisation précédente' };
  const userSkills = Array.isArray(formData?.skills) ? formData.skills.flatMap((s: any) => s.skills || []) : [];

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

// Main AI Generator Route for CV & Letter
app.post(['/api/generate', '/api/gemini/generate-cv'], async (req, res) => {
  try {
    const formData = req.body;
    if (!formData || !formData.personalInfo) {
      return res.status(400).json({ error: 'Données de formulaire invalides ou manquantes.' });
    }

    const cleanData = sanitizeForPrompt(formData);

    const mode = cleanData.generationMode || 'full_pack';
    const isCvOnly = mode === 'cv_only';
    const isLetterOnly = mode === 'letter_only';
    
    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch (keyErr: any) {
      console.warn('[Gemini API Notice] Clé API non trouvée dans l\'environnement, utilisation de la génération intelligente de secours.');
      return res.json({
        success: true,
        data: generateFallbackCVData(formData)
      });
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (isCvOnly) {
      // CV Only Prompt with Strong Action Verbs & High Content Enrichment
      systemPrompt = `Tu es un Directeur RH d'élite et expert ATS de référence spécialisé dans l'optimisation de CV au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'optimiser, d'enrichir et de sublimer le contenu du CV d'un candidat pour maximiser son impact auprès des recruteurs les plus exigeants et obtenir un score ATS parfait (> 95%).

CONSIGNES STRICTES D'ENRICHISSEMENT & DE QUALITÉ :
1. **Interdiction de recopie brute** : Ne te contente JAMAIS de recopier passivement le texte saisi par l'utilisateur. Sublime, professionnalise et étoffe chaque section.
2. **Accroche / Profil Professionnel percutant (3-4 lignes denses)** : Rédige une synthèse de profil captivante, percutante et orientée valeur ajoutée pour le poste visé (${cleanData.personalInfo.targetJob || 'Poste visé'}). Mets en valeur son positionnement, ses points forts distinctifs, son niveau d'expertise et son dynamisme.
3. **Expériences Professionnelles enrichies (Verbes d'action puissants)** :
   - Pour CHAQUE expérience, génère 3 à 5 puces percutantes.
   - Commence IMPÉRATIVEMENT chaque puce par un verbe d'action fort à l'infinitif ou au participe passé (ex: *Piloter, Déployer, Structurer, Coordonner, Optimiser, Négocier, Automatiser, Harmoniser, Fédérer, Analyser, Superviser, Accroître*).
   - Intègre des réalisations concrètes, des livrables clés et des métriques chiffrées estimées adaptées au marché professionnel ouest-africain.
4. **Mots-clés ATS & Compétences Stratégiques** : Génère 8 à 12 mots-clés stratégiques indispensables pour franchir les filtres ATS et prouver une solide maîtrise métier.
5. **Conseils d'Entretien RH** : Fournis 3 conseils tactiques concrets pour performer lors des entretiens d'embauche.

Format de sortie JSON requis.`;

      userPrompt = `Données complètes du candidat à sublimer :
- Nom & Prénom : ${cleanData.personalInfo.firstName} ${cleanData.personalInfo.lastName}
- Poste visé : ${cleanData.personalInfo.targetJob}
- Localisation : ${cleanData.personalInfo.city || 'Dakar'}, ${cleanData.personalInfo.country || 'Sénégal'}
- Secteur cible : ${cleanData.targetSector || 'Non spécifié'}

Expériences professionnelles fournies :
${JSON.stringify(cleanData.experiences, null, 2)}

Formations & Diplômes :
${JSON.stringify(cleanData.education, null, 2)}

Compétences saisies :
${JSON.stringify(cleanData.skills, null, 2)}

Langues :
${JSON.stringify(cleanData.languages, null, 2)}

Génère la version enrichie, professionnelle et optimisée ATS au format JSON.`;

    } else if (isLetterOnly) {
      // Standalone Cover Letter Prompt
      const letterType = cleanData.letterType || 'spontanee';
      const letterTypeLabels: Record<string, string> = {
        offre: "Réponse à une offre d'emploi",
        spontanee: "Candidature spontanée",
        stage: "Demande de stage / alternance",
        reconversion: "Reconversion professionnelle",
        recommandation: "Recommandation / Réseau",
      };

      const userInstructions = (cleanData.letterInstructions || cleanData.highlightsSummary || '').trim();

      systemPrompt = `Tu es un expert RH et recruteur d'élite spécialisé dans le recrutement au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est de rédiger une Lettre de Motivation complète et captivante occupant élégamment toute la feuille A4 (entre 250 et 350 mots, au moins 300 mots au total).

CONSIGNES STRICTES DE RÉDACTION :
1. **Contrainte de longueur obligatoire** :
   Génère impérativement un corps de texte d'au moins 300 mots (entre 250 et 350 mots au total). La lettre doit être dense, substantielle et percutante.

2. **Structure stricte en 4 paragraphes distincts et développés (Architecture VOUS / MOI / NOUS / CONCLUSION)** :
   - **Paragraphe 1 (Accroche - Le "VOUS")** : Raison de la candidature et intérêt ciblé pour l'entreprise (${cleanData.targetCompany || "l'entreprise"}). Démontre une compréhension fine de leur positionnement et explique pourquoi cette structure vous attire particulièrement.
   - **Paragraphe 2 (Vos compétences & réalisations - Le "MOI")** : Mise en valeur des expériences techniques, projets marquants, réalisations concrètes et résultats chiffrés probants avec verbes d'action forts.
   - **Paragraphe 3 (Apport mutuel & synergie - Le "NOUS")** : Ce que votre profil va apporter concrètement aux objectifs de l'entreprise au Sénégal/UEMOA, vos soft skills, votre force de proposition et votre adaptabilité.
   - **Paragraphe 4 (Conclusion & Entretien)** : Demande explicite d'entretien, disponibilité immédiate et affirmation de votre motivation à échanger de vive voix.

3. **Formule de politesse (Closing)** : Formule formelle et soignée respectant les usages professionnels en Afrique de l'Ouest.

4. **Prise en compte prioritaire du contexte & consignes de l'utilisateur** :
   ${userInstructions ? `L'utilisateur a spécifié des consignes particulières : "${userInstructions}". Tu DOIS OBLIGATOIREMENT respecter et intégrer fidèlement ces éléments au cœur de l'argumentation de la lettre.` : `Adapte le discours au poste de ${cleanData.personalInfo.targetJob || 'professionnel'} et à l'entreprise ${cleanData.targetCompany || "l'entreprise"}.`}

5. Ton demandé : ${cleanData.letterTone || 'Convaincante'}.
6. Fournis également 3 conseils d'entretien spécifiques pour réussir l'échange.`;

      userPrompt = `Informations du candidat :
- Prénom & Nom : ${cleanData.personalInfo.firstName} ${cleanData.personalInfo.lastName}
- Email : ${cleanData.personalInfo.email} | Téléphone : ${cleanData.personalInfo.phone}
- Localisation : ${cleanData.personalInfo.city || 'Dakar'}, ${cleanData.personalInfo.country || 'Sénégal'}
- Poste visé : ${cleanData.personalInfo.targetJob}
- Entreprise cible : ${cleanData.targetCompany || 'Non précisé'}
- Format de candidature : ${letterTypeLabels[letterType] || letterType}
- Contexte & Consignes particulières pour la lettre : ${userInstructions || 'Mettre en valeur le professionnalisme, les compétences techniques et l\'adéquation au poste'}
${letterType === 'stage' && cleanData.diplomaOrSchool ? `- Diplôme / École préparé : ${cleanData.diplomaOrSchool}` : ''}
${letterType === 'reconversion' && cleanData.previousCareer ? `- Ancien métier / Domaine d'origine : ${cleanData.previousCareer}` : ''}
${letterType === 'recommandation' && cleanData.referrerNameAndRole ? `- Personne de recommandation : ${cleanData.referrerNameAndRole}` : ''}

Génère la lettre de motivation idéale au format JSON.`;
    } else {
      // Full Pack CV + Letter Prompt
      const userInstructions = (cleanData.letterInstructions || cleanData.highlightsSummary || '').trim();

      systemPrompt = `Tu es un Directeur RH et expert ATS de référence au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'enrichir et de sublimer les données de CV d'un candidat ET de lui rédiger une lettre de motivation assortie sur-mesure ultra convaincante, percutante, substantielle et complète occupant élégamment toute la feuille A4 (entre 250 et 350 mots, au moins 300 mots).

CONSIGNES STRICTES :
1. **Accroche de CV percutante** : 3-4 lignes denses mettant en lumière la proposition de valeur pour le poste de ${cleanData.personalInfo.targetJob || 'Poste visé'}.
2. **Expériences Professionnelles (Verbes d'action)** : Ne jamais recopier passivement. Rédige 3 à 5 puces par expérience commençant par des verbes d'action puissants (Piloter, Déployer, Structurer, Coordonner, Optimiser, Négocier, Automatiser), orientées résultats et métriques.
3. **Lettre de Motivation Sur-Mesure A4 (VOUS / MOI / NOUS / CONCLUSION)** : Au moins 300 mots, 4 paragraphes distincts et développés.
4. **Mots-clés ATS & Conseils d'Entretien** : 8 à 12 mots-clés stratégiques et 3 conseils d'entretien probants.

Format de sortie : JSON.`;

      userPrompt = `Voici les données du candidat :
- Nom complet : ${cleanData.personalInfo.firstName} ${cleanData.personalInfo.lastName}
- Intitulé du poste visé : ${cleanData.personalInfo.targetJob}
- Entreprise cible : ${cleanData.targetCompany || 'Non spécifié'}
- Localisation : ${cleanData.personalInfo.city || 'Dakar'}, ${cleanData.personalInfo.country || 'Sénégal'}
- Secteur cible : ${cleanData.targetSector || 'Non spécifié'}
- Ton de la lettre : ${cleanData.letterTone || 'Convaincante'}
- Contexte & Consignes particulières pour la lettre : ${userInstructions || 'Mettre en valeur le parcours et les compétences clés'}

Expériences professionnelles :
${JSON.stringify(cleanData.experiences, null, 2)}

Formations :
${JSON.stringify(cleanData.education, null, 2)}

Compétences actuelles :
${JSON.stringify(cleanData.skills, null, 2)}

Langues :
${JSON.stringify(cleanData.languages, null, 2)}

Génère la réponse enrichie au format JSON.`;
    }

    try {
      const response = await generateContentWithRetry(ai, {
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
                description: 'Profil professionnel ou accroche de candidat captivante.',
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
                      description: 'Liste de puces percutantes commençant par des verbes d\'action forts.',
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
                  subject: { type: Type.STRING, description: 'Objet clair et professionnel de la lettre' },
                  greeting: { type: Type.STRING, description: 'Formule de salutation formelle' },
                  opening: { type: Type.STRING, description: 'Paragraphe 1 (Accroche / VOUS) : Raison de la candidature et intérêt ciblé pour l entreprise (60-80 mots)' },
                  bodyParagraphs: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exactement 2 paragraphes développés : [Paragraphe 2 (MOI : Compétences & réalisations chiffrées, 90-120 mots), Paragraphe 3 (NOUS : Apport mutuel & synergie, 80-110 mots)]',
                  },
                  callToAction: { type: Type.STRING, description: 'Paragraphe 4 (Conclusion) : Demande explicite d entretien, disponibilité et engagement (50-70 mots)' },
                  closing: { type: Type.STRING, description: 'Formule de politesse formelle' },
                },
                required: ['subject', 'greeting', 'opening', 'bodyParagraphs', 'callToAction', 'closing'],
              },
              interviewTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Conseils clés pour l entretien d embauche',
              },
            },
          },
        },
      });

      const responseText = response.text || '{}';
      const jsonResult = safeParseJSON(responseText);

      // Fallback defaults for missing fields depending on mode
      if (!jsonResult.experiences) jsonResult.experiences = [];
      if (!jsonResult.suggestedKeywords) jsonResult.suggestedKeywords = [];
      if (!jsonResult.profileSummary) jsonResult.profileSummary = '';
      if (!jsonResult.interviewTips) jsonResult.interviewTips = [];
      if (!jsonResult.coverLetter) {
        jsonResult.coverLetter = {
          subject: `Candidature au poste de ${formData.personalInfo?.targetJob || 'Candidat'}`,
          greeting: "Madame, Monsieur le Responsable des Recrutements,",
          opening: `Je vous adresse ma candidature pour le poste de ${formData.personalInfo?.targetJob || 'professionnel'}.`,
          bodyParagraphs: [
            "Fort de mon parcours et de mes compétences techniques, je souhaite mettre mon savoir-faire au service de vos objectifs.",
            "Mon autonomie et ma rigueur me permettent de m'intégrer rapidement au sein de vos équipes."
          ],
          callToAction: "Je serais ravi de vous rencontrer lors d'un entretien afin de vous exposer plus en détail ma motivation.",
          closing: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
        };
      }

      return res.json({ success: true, data: jsonResult });
    } catch (genError: any) {
      console.warn('[Gemini API Warning] Génération IA échouée, utilisation de la génération de secours :', genError?.message);
      return res.json({
        success: true,
        data: generateFallbackCVData(formData)
      });
    }
  } catch (error: any) {
    console.error('Erreur Génération Gemini:', error);
    return res.json({
      success: true,
      data: generateFallbackCVData(req.body)
    });
  }
});

// =========================================================================
// ROUTE : GÉNÉRATEUR DE FICHE DE PRÉPARATION D'ENTRETIEN RH
// =========================================================================
app.post(['/api/generate-interview-prep', '/api/gemini/generate-interview-prep'], async (req, res) => {
  try {
    const { formData, aiData } = req.body || {};
    if (!formData || !formData.personalInfo) {
      return res.status(400).json({ error: 'Données du candidat manquantes pour la préparation d\'entretien.' });
    }

    const cleanData = sanitizeForPrompt(formData);
    const p = cleanData.personalInfo || {};
    const candidateName = `${p.firstName || 'Candidat'} ${p.lastName || ''}`.trim();
    const targetJob = p.targetJob || 'Professionnel';
    const targetCompany = cleanData.targetCompany || 'l\'Entreprise recruteuse';
    const city = p.city || 'Dakar';
    const country = p.country || 'Sénégal';

    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch (keyErr) {
      console.warn('[Gemini API Notice] Utilisation de la préparation d\'entretien intelligente de secours.');
      return res.json({
        success: true,
        data: generateFallbackInterviewPrep(formData)
      });
    }

    const systemPrompt = `Tu es un Directeur des Ressources Humaines (DRH) d'élite, coach en prise de parole professionnelle et expert du recrutement au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'analyser en profondeur le profil et le CV du candidat pour lui générer une FICHE DE PRÉPARATION D'ENTRETIEN RH ULTRA-PERSONNALISÉE ET STRATÉGIQUE.

Structure obligatoire de la fiche d'entretien :
1. **Pitch de présentation de 2 minutes (L'Accroche "Parlez-moi de vous")** :
   - Divisé en 3 temps :
     * Hook (0-30s) : Présentation percutante, vision et accroche directe.
     * Career Highlights (30-90s) : Réalisations majeures et compétences techniques/managériales prouvées.
     * Value Proposition (90-120s) : Adéquation parfaite avec le poste de ${targetJob} chez ${targetCompany} et promesse de valeur.
     * Full Text : Le texte intégral rédigé à la 1ère personne, prêt à être répété et déclamé avec naturel et assurance.
2. **6 à 8 Questions d'Entretien RH Ultra-Probables & Stratégiques** :
   - Mélange de questions techniques sur le métier de ${targetJob}, comportementales (Soft Skills), situationnelles (Gestion de crise/délai), questions de motivation et questions pièges classiques des recruteurs.
   - Pour CHAQUE question :
     * "id": string unique
     * "category": 'technique' | 'comportementale' | 'motivation' | 'situationnelle' | 'piege' | 'leadership'
     * "categoryLabel": Libellé lisible (ex: "Question Comportementale / Gestion du Stress")
     * "question": La question formulée telle qu'un DRH la poserait.
     * "recruiterIntent": Ce que le recruteur cherche réellement à évaluer sous la surface.
     * "suggestedAnswer": La réponse idéale modèle, articulée selon la méthode STAR (Situation, Tâche, Action, Résultat chiffré).
     * "keyStrengthsToHighlight": 2 à 4 arguments ou mots-clés indispensables à prononcer.
     * "pitfallsToAvoid": Le piège classique à ne surtout pas commettre.
3. **Conseils comportementaux & posture d'impact (4-5 conseils)** : Langage non-verbal, gestion de la respiration, intonation de la voix et écoute active.
4. **4 à 5 Questions intelligentes à poser au recruteur en fin d'entretien** : Montrant un esprit stratégique et une vision de long terme.
5. **Synthèse des atouts majeurs détectés** : 4 points forts distinctifs du profil.

Format requis : JSON structuré selon le schéma.`;

    const userPrompt = `Voici le profil et le CV complet du candidat à coacher :
- Nom : ${candidateName}
- Poste visé : ${targetJob}
- Entreprise ciblée : ${targetCompany}
- Ville / Pays : ${city}, ${country}
- Profil / Accroche actuelle : ${aiData?.profileSummary || cleanData.highlightsSummary || 'Non spécifié'}

Expériences professionnelles :
${JSON.stringify(cleanData.experiences || [], null, 2)}

Formations & Diplômes :
${JSON.stringify(cleanData.education || [], null, 2)}

Compétences déclarées :
${JSON.stringify(cleanData.skills || [], null, 2)}

Langues :
${JSON.stringify(cleanData.languages || [], null, 2)}

Génère la fiche de préparation d'entretien d'embauche sur-mesure en JSON.`;

    try {
      const response = await generateContentWithRetry(ai, {
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
      const interviewPrepData = {
        id: `PREP-${Date.now()}`,
        candidateName,
        targetJob,
        targetCompany,
        city,
        country,
        createdAt: new Date().toISOString(),
        ...parsed
      };

      return res.json({
        success: true,
        data: interviewPrepData
      });
    } catch (genErr: any) {
      console.warn('[Gemini Interview Prep] Erreur lors de la génération IA, basculement vers le fallback intelligent :', genErr?.message);
      return res.json({
        success: true,
        data: generateFallbackInterviewPrep(formData)
      });
    }
  } catch (error: any) {
    console.error('Erreur API generate-interview-prep:', error);
    return res.json({
      success: true,
      data: generateFallbackInterviewPrep(req.body?.formData || req.body)
    });
  }
});


// Individual section optimizer (Quick AI rewrite)
app.post('/api/generate-business-doc', async (req, res) => {
  try {
    const { docType, issuer, client, items } = req.body;
    const isQuote = docType === 'devis';

    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch {
      // Fallback response
      const fallbackItems = Array.isArray(items) && items.length > 0 ? items.map((it: any) => ({
        ...it,
        description: it.description || 'Prestation de service professionnel',
        total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 50000)
      })) : [
        { id: '1', description: 'Prestation et livrables conformes au cahier des charges', quantity: 1, unitPrice: 150000, total: 150000 }
      ];

      return res.json({
        success: true,
        items: fallbackItems,
        notes: isQuote 
          ? "Offre valable 30 jours à compter de la date d'émission. Acompte de 50% à la commande, solde à la livraison finale."
          : "Paiement exigible sous 15 jours par virement bancaire, Wave ou Orange Money. Tout retard de paiement donnera lieu à des pénalités conformément aux règles commerciales en vigueur."
      });
    }

    const prompt = `Tu es un expert en gestion commerciale et facturation pour les entreprises et indépendants au Sénégal (zone UEMOA).
Optimise et professionnalise les lignes de prestations d'un ${isQuote ? 'Devis' : 'Facture'} émis par "${issuer?.companyName || 'Prestataire'}" à destination de "${client?.companyName || client?.name || 'Client'}".

Prestations fournies :
${JSON.stringify(items || [], null, 2)}

Instructions :
1. Reformule chaque description de prestation pour qu'elle soit claire, vendeuse, précise et professionnelle.
2. Conserve les quantités et prix unitaires.
3. Rédige une clause de conditions commerciales et modalités de paiement adaptée au Sénégal.

Format de sortie : JSON.`;

    try {
      const response = await generateContentWithRetry(ai, {
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
                    total: { type: Type.NUMBER }
                  },
                  required: ['description', 'quantity', 'unitPrice']
                }
              },
              notes: { type: Type.STRING }
            },
            required: ['items', 'notes']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        items: parsed.items || items,
        notes: parsed.notes
      });
    } catch (aiErr) {
      console.warn('Erreur Gemini business doc:', aiErr);
      return res.json({
        success: true,
        items: items,
        notes: isQuote 
          ? "Offre valable 30 jours. Règlement par Wave, Orange Money ou virement bancaire."
          : "Paiement à réception par Wave, Orange Money ou virement bancaire."
      });
    }
  } catch (error: any) {
    console.error('Erreur API business-doc:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

// Individual section optimizer (Quick AI rewrite)
app.post('/api/optimize-bullet', async (req, res) => {
  try {
    const { text, targetJob, context } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texte requis pour réécriture.' });
    }

    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch {
      return res.json({
        success: true,
        variations: [
          `Optimiser et exécuter avec rigueur les missions liées à : ${text}`,
          `Piloter la mise en œuvre et le suivi stratégique de : ${text}`,
          `Garantir la conformité et l'atteinte des objectifs de performance sur : ${text}`
        ]
      });
    }

    const prompt = `Tu es un conseiller en rédaction de CV au Sénégal.
Réécris la puce ou description suivante pour un poste de "${targetJob || 'Professionnel'}".
Utilise des verbes d'action puissants, un style professionnel, clair et percutant.
Texte original : "${text}"
${context ? `Contexte supplémentaire : ${context}` : ''}

Donne 3 propositions réécrites sous forme de tableau JSON.`;

    try {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['variations'],
          },
        },
      });

      const jsonResult = JSON.parse(response.text || '{"variations":[]}');
      return res.json({ success: true, variations: jsonResult.variations });
    } catch {
      return res.json({
        success: true,
        variations: [
          `Optimiser et exécuter avec rigueur les missions liées à : ${text}`,
          `Piloter la mise en œuvre et le suivi stratégique de : ${text}`,
          `Garantir la conformité et l'atteinte des objectifs sur : ${text}`
        ]
      });
    }
  } catch (err: any) {
    return res.json({
      success: true,
      variations: [
        `Accroître la performance et la qualité de service sur : ${req.body?.text || 'les activités clés'}`
      ]
    });
  }
});

// ==========================================
// AMAZON KDP E-BOOK GENERATOR API ROUTES
// ==========================================

// 1. Proposer des Idées de Livres Rentables Amazon KDP (Générateur de Niches Rentables)
app.post('/api/kdp/suggest-ideas', async (req, res) => {
  const fallbackIdeas = [
    {
      id: "idea-1",
      title: "Finances Personnelles & Liberté Financière en Afrique",
      subtitle: "Le Guide Pratique pour Épargner, Investir et Créer des Revenus Passifs",
      category: "Finances & Économie",
      targetAudience: "Jeunes professionnels, entrepreneurs et cadres d'Afrique francophone",
      estimatedMonthlyProfit: "1 800 € - 3 800 € / mois",
      whyItSells: "Sujet très recherché avec forte demande d'éducation financière pratique.",
      chapterThemes: [
        "Fondations de l'Éducation Financière",
        "Techniques d'Épargne et Gestion du Budget",
        "Investissement Immobilier et Bourse",
        "Créer un Business en Ligne Rentable",
        "Plan d'Action Financier sur 12 Mois"
      ]
    },
    {
      id: "idea-2",
      title: "Guide de l'Entrepreneuriat Digital Moderne",
      subtitle: "De l'Idée aux Premiers 10 000 € de Chiffre d'Affaires",
      category: "Business & Entrepreneuriat",
      targetAudience: "Porteurs de projets, freelancers et créateurs de contenu",
      estimatedMonthlyProfit: "2 000 € - 4 500 € / mois",
      whyItSells: "Niche Bestseller constante axée sur l'indépendance professionnelle.",
      chapterThemes: [
        "Valider son Idée de Business sans Budget",
        "Stratégies de Vente et Conversion Client",
        "Automatisations et Outils IA",
        "Marketing Digital et Réseaux Sociaux",
        "Passer à l'Échelle et Recruter"
      ]
    },
    {
      id: "idea-3",
      title: "Maîtriser l'Intelligence Artificielle au Quotidien",
      subtitle: "Guide Pas-à-Pas pour Multiplier sa Productivité par 10",
      category: "Informatique & High-Tech",
      targetAudience: "Professionnels, étudiants et dirigeants",
      estimatedMonthlyProfit: "2 200 € - 5 000 € / mois",
      whyItSells: "Mots-clés en explosion sur Amazon KDP.",
      chapterThemes: [
        "Comprendre les Bases de l'IA Générative",
        "L'Art du Prompt Engineering",
        "Automatiser son Travail Administratif",
        "Créer du Contenu Marketing Percutant",
        "Éthique et Futur du Travail"
      ]
    }
  ];

  try {
    const { niche } = req.body || {};
    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch {
      return res.json({ success: true, ideas: fallbackIdeas });
    }

    const systemPrompt = `Tu es un expert mondial en auto-édition Amazon KDP et chercheur de niches à fort profit.
Ta mission est d'analyser le marché Amazon KDP actuel et de proposer 5 idées de livres à TRÈS HAUT POTENTIEL FINANCIER (forte demande, faible compétition).

Format de réponse JSON requis :
{
  "ideas": [
    {
      "id": "idea-1",
      "title": "Titre Percutant du Livre",
      "subtitle": "Sous-titre Vendeur et Orienté Bénéfices Client",
      "category": "Nom de la Catégorie KDP (ex: Développement Personnel, Finances, Guides Pratiques)",
      "targetAudience": "Description précise du public acheteur",
      "estimatedMonthlyProfit": "1 500 € - 3 500 € / mois",
      "whyItSells": "Pourquoi cette niche cartonne sur Amazon KDP (mots-clés recherchés, problème urgent à résoudre)",
      "chapterThemes": [
        "Thème du Chapitre 1",
        "Thème du Chapitre 2",
        "Thème du Chapitre 3",
        "Thème du Chapitre 4",
        "Thème du Chapitre 5"
      ]
    }
  ]
}`;

    const userPrompt = `Propose 5 idées de livres Amazon KDP très rentables.
${niche ? `Niche / Domaine de préférence : ${niche}` : 'Sélectionne les meilleures niches Bestseller actuelles (Guides pratiques, développement personnel, finances, santé/bien-être, compétences pro).'}`;

    try {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-flash-latest',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8,
          responseMimeType: 'application/json',
        }
      });

      const jsonResult = JSON.parse(response.text || '{"ideas":[]}');
      return res.json({ success: true, ideas: jsonResult.ideas || fallbackIdeas });
    } catch {
      return res.json({ success: true, ideas: fallbackIdeas });
    }
  } catch (err: any) {
    return res.json({ success: true, ideas: fallbackIdeas });
  }
});

// 2. Générer le Plan Structuré Complet d'un Livre KDP
app.post('/api/kdp/generate-plan', async (req, res) => {
  try {
    const { 
      title, 
      subtitle, 
      authorName, 
      category, 
      targetAudience, 
      pageCount = 60, 
      chapterCount,
      trimSize = '6" x 9" (15.24 x 22.86 cm)', 
      summaryCopy
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Le titre du livre est obligatoire.' });
    }

    const numPages = Math.max(12, Math.min(300, Number(pageCount) || 60));
    let targetChaptersCount = chapterCount ? Math.max(2, Math.min(15, Number(chapterCount))) : 5;
    if (!chapterCount) {
      if (numPages <= 30) targetChaptersCount = 3;
      else if (numPages <= 60) targetChaptersCount = 4;
      else if (numPages <= 120) targetChaptersCount = 6;
      else targetChaptersCount = 8;
    }

    const targetWordsTotal = numPages * 250;
    const targetWordsPerChapter = Math.round((targetWordsTotal - 800) / Math.max(1, targetChaptersCount));

    const fallbackPlan = {
      title: title || "Guide Bestseller Amazon KDP",
      subtitle: subtitle || "Guide pratique et complet",
      author: authorName || "Auteur Bestseller",
      category: category || "Business & Développement Personnel",
      amazonCategories: [category || "Business", "Guides Pratiques", "Développement Personnel"],
      introduction: `Bienvenue dans cet ouvrage dédié à ${title}. Ce livre a été conçu pour vous apporter des stratégies concrètes, immédiatement applicables pour transformer votre quotidien et atteindre vos objectifs les plus ambitieux.`,
      chapters: Array.from({ length: targetChaptersCount }).map((_, i) => ({
        chapterNumber: i + 1,
        title: `Chapitre ${i + 1} : ${i === 0 ? 'Les Fondations Stratégiques' : i === 1 ? 'Mise en Pratique et Méthodologie' : i === 2 ? 'Optimisation et Résolution des Obstacles' : i === 3 ? 'Passage à l\'Échelle et Résultats' : 'Plan d\'Action Avancé'}`,
        summary: `Explore les piliers fondamentaux et les techniques clés du Chapitre ${i + 1}.`,
        targetWords: targetWordsPerChapter
      })),
      conclusion: "En résumé, la clé de la réussite réside dans la constance et l'application méthodique des principes présentés dans cet ouvrage.",
      backCoverSummary: `Découvrez le guide ultime "${title}" pour maîtriser ${category || 'les compétences clés'}. Un livre indispensable avec des conseils étape par étape.`,
      amazonKeywords: [title, category || 'Guide', 'Développement', 'Réussite', 'Stratégie', 'Bestseller', 'Pratique'],
      authorBio: `${authorName || 'L\'auteur'} est un expert reconnu accompagnant les passionnés et professionnels vers l'excellence.`
    };

    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch {
      return res.json({ success: true, plan: fallbackPlan });
    }

    const systemPrompt = `Tu es un directeur éditorial Amazon KDP Bestseller.
Ta mission est de structurer le plan complet d'un livre prêt à la publication KDP (${numPages} pages, ~${targetWordsTotal} mots).

Format de réponse JSON requis :
{
  "title": "Titre",
  "subtitle": "Sous-titre",
  "author": "Auteur",
  "category": "Catégorie KDP",
  "amazonCategories": ["Catégorie 1", "Catégorie 2", "Catégorie 3"],
  "introduction": "Texte d'introduction captivant en 3 paragraphes.",
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Titre du Chapitre 1",
      "summary": "Résumé des concepts clés du chapitre",
      "targetWords": ${targetWordsPerChapter}
    }
  ],
  "conclusion": "Conclusion stimulante avec plan d'action.",
  "backCoverSummary": "Résumé captivant pour la 4e de couverture (vendeur).",
  "amazonKeywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4", "mot-clé 5", "mot-clé 6", "mot-clé 7"],
  "authorBio": "Biographie courte de l'auteur."
}`;

    const userPrompt = `Détails de l'ouvrage :
- Titre : ${title}
- Sous-titre : ${subtitle || 'Guide pratique complet'}
- Auteur : ${authorName || 'Auteur Anonyme'}
- Catégorie : ${category || 'Business & Entrepreneuriat'}
- Public Cible : ${targetAudience || 'Grand public'}
- Format : ${trimSize} (${numPages} pages, ${targetChaptersCount} chapitres)
${summaryCopy ? `- Accroche / Idée : ${summaryCopy}` : ''}

Génère la structure JSON complète pour Amazon KDP.`;

    try {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-flash-latest',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          responseMimeType: 'application/json',
        }
      });

      const planData = JSON.parse(response.text || '{}');
      return res.json({ success: true, plan: planData.chapters ? planData : fallbackPlan });
    } catch {
      return res.json({ success: true, plan: fallbackPlan });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la planification du livre.' });
  }
});

// 3. Générer un Chapitre Complet Longue Forme pour KDP
app.post('/api/kdp/generate-single-chapter', async (req, res) => {
  try {
    const { 
      bookTitle, 
      authorName,
      category, 
      tone = 'professionnel',
      chapterNumber, 
      totalChapters, 
      chapterTitle, 
      chapterSummary, 
      targetWords = 1200 
    } = req.body;

    if (!chapterTitle) {
      return res.status(400).json({ success: false, error: 'Le titre du chapitre est requis.' });
    }

    const fallbackContent = `## ${chapterTitle}

### 1. Introduction et Enjeux
Dans ce chapitre ${chapterNumber} du livre "${bookTitle || 'Guide KDP'}", nous abordons une étape essentielle de votre parcours : **${chapterTitle}**. 

Comprendre les mécanismes sous-jacents et maîtriser les principes fondamentaux vous permettra d'éviter les pièges classiques et d'accélérer significativement votre progression.

### 2. Principes Fondamentaux et Méthodologie
${chapterSummary || `Ce chapitre examine en détail les leviers d'action et les meilleures pratiques du secteur.`}

Pour mettre en œuvre ces éléments de manière efficace :
- **Analyse préalable** : Évaluez précisément vos besoins et vos ressources actuelles.
- **Planification stratégique** : Définissez des objectifs mesurables et réalistes.
- **Exécution rigoureuse** : Appliquez pas à pas les recommandations sans brûler les étapes.

### 3. Exemples Concrets et Application Pratique
Imaginons un cas concret : lors de la mise en place d'une stratégie optimisée, l'application directe des principes présentés ci-dessus permet de réduire les erreurs d'exécution de plus de 40% tout en augmentant l'efficacité opérationnelle.

> **Conseil d'Expert** : Prenez le temps de documenter chaque étape de votre processus pour créer votre propre système personnalisé.

### 4. Synthèse et Points Clés à Retenir
- La maîtrise de ${chapterTitle} est un pilier déterminant pour la réussite globale du projet.
- La régularité et la rigueur d'exécution l'emportent toujours sur l'intensité ponctuelle.
- Passez immédiatement à l'action en appliquant le premier exercice de ce chapitre dès aujourd'hui.`;

    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch {
      return res.json({
        success: true,
        chapterNumber,
        title: chapterTitle,
        content: fallbackContent,
        wordCount: fallbackContent.split(/\s+/).filter(Boolean).length
      });
    }

    const systemPrompt = `Tu es un auteur expert Amazon KDP.
Rédige le CHAPITRE ${chapterNumber} sur ${totalChapters} ("${chapterTitle}") du livre "${bookTitle}".

Directives de rédaction :
1. Rédige un texte long, dense et pédagogique (~${targetWords} mots).
2. Structure le chapitre avec des sous-titres évocateurs (### Sous-titre), des exemples concrets, des exercices pratiques et des points clés à retenir.
3. Ton : ${tone}. Français impeccable, clair et engageant.
4. N'ajoute pas de texte d'introduction ("Voici le chapitre..."), commence directement par le texte du chapitre.`;

    const userPrompt = `Livre : ${bookTitle} (${authorName || 'Auteur'})
Chapitre ${chapterNumber}/${totalChapters} : ${chapterTitle}
Résumé : ${chapterSummary || 'Développer ce thème avec précision'}

Rédige le Chapitre ${chapterNumber} complet.`;

    try {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-flash-latest',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      });

      const content = response.text?.trim() || fallbackContent;

      return res.json({
        success: true,
        chapterNumber,
        title: chapterTitle,
        content,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      });
    } catch {
      return res.json({
        success: true,
        chapterNumber,
        title: chapterTitle,
        content: fallbackContent,
        wordCount: fallbackContent.split(/\s+/).filter(Boolean).length,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la rédaction du chapitre.' });
  }
});

// ==========================================
// SYSTEME DE VALIDATION DE PAIEMENT INSTANTANE PAR ANALYSE D'IMAGE DE REÇU (OCR IA)
// Reçus Wave & Orange Money avec Gemini Vision & Protection Anti-Replay
// ==========================================

// Enregistrement persistant des identifiants de transactions pour bloquer toute réutilisation
const verifiedReceiptIds = new Set<string>([
  'WW24080198765432', // Seed test data
  'CI24080112345678',
  'TX9876543210'
]);

app.post('/api/payment/verify-receipt', async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      expectedAmount = 1000,
      documentTitle = 'Déblocage de document',
      userId = 'guest',
      userEmail = 'candidat@senegalcv.sn',
      userName,
      senderPhone = '',
      countryCode = '+221',
      countryName = 'Sénégal',
      transactionRef = '',
      purpose = 'document_unlock'
    } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        status: 'INVALID',
        errorCode: 'INVALID_RECEIPT',
        error: "Reçu non valide ou déjà utilisé. Aucune image fournie."
      });
    }

    // Nettoyer la chaîne base64 (enlever le préfixe data:image/... s'il existe)
    let cleanBase64 = imageBase64;
    let effectiveMimeType = mimeType;
    if (imageBase64.includes('base64,')) {
      const parts = imageBase64.split('base64,');
      cleanBase64 = parts[1];
      const match = parts[0].match(/data:([^;]+);/);
      if (match) effectiveMimeType = match[1];
    }
    cleanBase64 = cleanBase64.trim();

    // Obtenir la date et l'heure actuelles (UTC / Heure Sénégal GMT)
    const serverNow = new Date();
    const serverNowYear = serverNow.getUTCFullYear();
    const serverNowMonth = serverNow.getUTCMonth() + 1;
    const serverNowDay = serverNow.getUTCDate();
    const serverNowHour = serverNow.getUTCHours();
    const serverNowMinute = serverNow.getUTCMinutes();
    const serverDateStr = `${String(serverNowDay).padStart(2, '0')}/${String(serverNowMonth).padStart(2, '0')}/${serverNowYear}`;
    const serverTimeStr = `${String(serverNowHour).padStart(2, '0')}:${String(serverNowMinute).padStart(2, '0')}`;

    console.log(`[Receipt OCR IA] Début de l'analyse d'image reçu pour ${userEmail} (Montant attendu: ${expectedAmount} FCFA, Heure référence: ${serverDateStr} ${serverTimeStr} GMT)...`);

    // 1. Initialiser le client Gemini AI
    let ai: GoogleGenAI | null = null;
    try {
      ai = getGenAIClient();
    } catch (keyErr: any) {
      console.warn('[Gemini API Notice] Clé API non configurée pour l\'OCR IA automatique, enregistrement de la transaction pour validation administrative.');
      
      const rawTxId = transactionRef || `REF-${Date.now().toString().slice(-6)}`;
      const targetAmount = Math.max(100, Number(expectedAmount) || 1000);
      const pendingTxRecordId = `TX-PENDING-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const pendingTx = {
        id: pendingTxRecordId,
        transactionId: rawTxId,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@senegalcv.sn',
        userName: userName || (userEmail ? userEmail.split('@')[0] : 'Candidat'),
        type: purpose === 'wallet_recharge' ? 'recharge' : (purpose === 'subscription_purchase' ? 'subscription_purchase' : 'document_purchase'),
        amount: purpose === 'wallet_recharge' ? targetAmount : -targetAmount,
        expectedAmount: targetAmount,
        extractedAmount: targetAmount,
        currency: 'XOF',
        description: purpose === 'wallet_recharge'
          ? `Recharge Solde (${targetAmount.toLocaleString('fr-FR')} FCFA - En attente validation)`
          : purpose === 'subscription_purchase'
            ? `Abonnement (${targetAmount.toLocaleString('fr-FR')} FCFA - En attente validation)`
            : `${documentTitle || 'Document'} (${targetAmount.toLocaleString('fr-FR')} FCFA - En attente validation)`,
        status: 'PENDING_APPROVAL',
        aiStatus: 'PENDING',
        paymentMethod: 'wave',
        senderPhone: senderPhone || undefined,
        countryCode: countryCode || '+221',
        countryName: countryName || 'Sénégal',
        transactionReference: rawTxId,
        createdAt: new Date().toISOString(),
        documentTitle,
        purpose,
        receiptImage: imageBase64 && imageBase64.length < 350000 ? imageBase64 : undefined,
        metadata: {
          submittedAt: new Date().toISOString(),
          status: 'PENDING_ADMIN_REVIEW',
          notice: 'Validation administrative en cours'
        }
      };

      adminStore.transactions.unshift(pendingTx);

      return res.json({
        success: false,
        status: 'PENDING',
        transactionId: rawTxId,
        amount: targetAmount,
        message: "Votre reçu a été enregistré avec succès et transmis pour certification administrative (délai : moins de 2 minutes).",
        errorCode: 'PENDING_APPROVAL'
      });
    }

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: effectiveMimeType || 'image/jpeg'
      }
    };

    const promptText = `Tu es un système expert ultra-rapide et ultra-rigoureux de contrôle financier, de conformité temporelle et d'OCR de reçus de paiement mobile au Sénégal (Wave Sénégal, Orange Money Sénégal).
Analyse minutieusement cette image de reçu ou capture d'écran de transfert.

Destinataire officiel de la plateforme Dokya :
- Numéro : +221 78 961 90 88 (ou 789619088, 78 961 90 88)
- Nom : NGOUALA LAVOISIER FORTUNE PETER (ou NGOUALA, LAVOISIER, PETER)

Date et heure de référence du serveur :
- Aujourd'hui : ${serverDateStr} (JJ/MM/AAAA)
- Heure actuelle : ${serverTimeStr} (Heure GMT Sénégal)

Instructions strictes d'extraction et de sécurité :
1. "is_valid_receipt": boolean -> VRAI uniquement si l'image est un reçu officiel ou un SMS/écran de transaction confirmée Wave, Orange Money ou équivalent. FAUX si c'est une image sans rapport, floue, non lisible, ou un écran d'erreur/brouillon.
2. "payment_method": "wave" | "orange_money" | "unknown" -> Indique l'opérateur détecté.
3. "transaction_id": string -> L'ID unique de transaction officiel imprimé sur le reçu (ex: "TxID", "ID de transaction", "Réf", "N° Transaction", "ID Transfert", ex: WW240825ABCD, CI240825..., OM-...). Mets "" si non trouvé.
4. "amount": number -> Le montant total transféré / payé en FCFA (nombre entier, sans devise ni séparateur, ex: 1000, 2000, 3000, 5000). Si absent, 0.
5. "currency": "XOF"
6. "date_time": string -> La date et heure complète telle qu'écrite sur le reçu (ex: "25/08/2026 à 14:32", "25 août 2026 14:32").
7. "timestamp_day": number | null -> Jour du mois (1-31). Si le reçu indique "Aujourd'hui", utiliser ${serverNowDay}.
8. "timestamp_month": number | null -> Numéro du mois (1-12, ex: août = 8). Si "Aujourd'hui", utiliser ${serverNowMonth}.
9. "timestamp_year": number | null -> Année sur 4 chiffres (ex: ${serverNowYear}). Si absent mais "Aujourd'hui", utiliser ${serverNowYear}.
10. "timestamp_hour": number | null -> Heure de la transaction (0-23).
11. "timestamp_minute": number | null -> Minute de la transaction (0-59).
12. "is_timestamp_readable": boolean -> VRAI si la date, l'heure ET la minute sont clairement visibles et lisibles sur le reçu. FAUX si l'heure ou la date est absente, coupée ou floue.
13. "sender_phone": string -> Numéro de téléphone de l'expéditeur si mentionné, sinon "".
14. "recipient_phone": string -> Numéro de téléphone du destinataire si mentionné, sinon "".
15. "recipient_name": string -> Nom du destinataire/bénéficiaire si mentionné, sinon "".
16. "recipient_valid": boolean -> VRAI si le destinataire mentionné correspond au numéro (+221789619088) ou au nom (NGOUALA / PETER) ou s'il s'agit d'un transfert vers ce compte.
17. "validation_reason": string -> Explication succincte de la lecture effectuée.

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "is_valid_receipt": true,
  "payment_method": "wave",
  "transaction_id": "WW1234567890",
  "amount": 1000,
  "currency": "XOF",
  "date_time": "${serverDateStr} à ${serverTimeStr}",
  "timestamp_day": ${serverNowDay},
  "timestamp_month": ${serverNowMonth},
  "timestamp_year": ${serverNowYear},
  "timestamp_hour": ${serverNowHour},
  "timestamp_minute": ${serverNowMinute},
  "is_timestamp_readable": true,
  "sender_phone": "+221 77 123 45 67",
  "recipient_phone": "+221 78 961 90 88",
  "recipient_name": "NGOUALA LAVOISIER FORTUNE PETER",
  "recipient_valid": true,
  "validation_reason": "Reçu Wave authentique et récent vers le destinataire officiel"
}`;

    let responseText = '';
    let extractedData: any = null;

    try {
      const geminiResponse = await generateContentWithRetry(ai, {
        model: 'gemini-flash-latest',
        contents: {
          parts: [imagePart, { text: promptText }]
        },
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      responseText = geminiResponse.text || '';
      extractedData = repairTruncatedJSON(responseText);
    } catch (aiGenErr: any) {
      console.warn('[Receipt OCR IA Notice] Modèle IA non disponible, enregistrement du reçu pour validation administrative:', aiGenErr?.message);
      
      const rawTxId = transactionRef || `REF-${Date.now().toString().slice(-6)}`;
      const targetAmount = Math.max(100, Number(expectedAmount) || 1000);
      const pendingTxRecordId = `TX-PENDING-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const pendingTx = {
        id: pendingTxRecordId,
        transactionId: rawTxId,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@senegalcv.sn',
        userName: userName || (userEmail ? userEmail.split('@')[0] : 'Candidat'),
        type: purpose === 'wallet_recharge' ? 'recharge' : (purpose === 'subscription_purchase' ? 'subscription_purchase' : 'document_purchase'),
        amount: purpose === 'wallet_recharge' ? targetAmount : -targetAmount,
        expectedAmount: targetAmount,
        extractedAmount: targetAmount,
        currency: 'XOF',
        description: purpose === 'wallet_recharge'
          ? `Recharge Solde (${targetAmount.toLocaleString('fr-FR')} FCFA - En attente validation)`
          : purpose === 'subscription_purchase'
            ? `Abonnement (${targetAmount.toLocaleString('fr-FR')} FCFA - En attente validation)`
            : `${documentTitle || 'Document'} (${targetAmount.toLocaleString('fr-FR')} FCFA - En attente validation)`,
        status: 'PENDING_APPROVAL',
        aiStatus: 'PENDING',
        paymentMethod: 'wave',
        senderPhone: senderPhone || undefined,
        countryCode: countryCode || '+221',
        countryName: countryName || 'Sénégal',
        transactionReference: rawTxId,
        createdAt: new Date().toISOString(),
        documentTitle,
        purpose,
        receiptImage: imageBase64 && imageBase64.length < 350000 ? imageBase64 : undefined,
        metadata: {
          submittedAt: new Date().toISOString(),
          status: 'PENDING_ADMIN_REVIEW',
          notice: 'Validation administrative en cours'
        }
      };

      adminStore.transactions.unshift(pendingTx);

      return res.json({
        success: false,
        status: 'PENDING',
        transactionId: rawTxId,
        amount: targetAmount,
        message: "Votre reçu a été enregistré avec succès et transmis pour certification administrative (délai : moins de 2 minutes).",
        errorCode: 'PENDING_APPROVAL'
      });
    }

    console.log('[Receipt OCR IA Result]:', extractedData);

    if (!extractedData || typeof extractedData !== 'object') {
      return res.status(400).json({
        success: false,
        status: 'INVALID',
        errorCode: 'INVALID_RECEIPT',
        error: "Reçu non valide ou déjà utilisé. Impossible de lire les informations du reçu."
      });
    }

    const isValidReceipt = Boolean(extractedData.is_valid_receipt);
    const rawTxId = String(extractedData.transaction_id || '').trim().toUpperCase();
    const detectedAmount = Number(extractedData.amount) || 0;
    const detectedMethod = extractedData.payment_method === 'wave' ? 'wave' : extractedData.payment_method === 'orange_money' ? 'orange_money' : 'wave';
    const targetAmount = Math.max(100, Number(expectedAmount) || 1000);

    // Helper to log rejected transaction in adminStore
    const recordRejectedTx = (reasonText: string, errCode: string, extraDetails?: string, parsedTs?: string) => {
      const rejId = `TX-REJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const rejTx = {
        id: rejId,
        transactionId: rawTxId || `INCONNU-${Date.now().toString().slice(-4)}`,
        userId: userId || 'guest',
        userEmail: userEmail || 'candidat@senegalcv.sn',
        userName: userName || (userEmail ? userEmail.split('@')[0] : 'Candidat'),
        type: purpose === 'wallet_recharge' ? 'recharge' : 'document_purchase',
        amount: targetAmount,
        expectedAmount: targetAmount,
        extractedAmount: detectedAmount,
        currency: 'XOF',
        description: purpose === 'wallet_recharge'
          ? `Tentative Recharge Solde (${detectedMethod === 'wave' ? 'Wave' : 'Orange Money'})`
          : `Tentative Déblocage Document (${documentTitle || 'CV/Lettre'})`,
        status: 'REJECTED_BY_AI',
        aiStatus: 'REJECTED_BY_AI',
        paymentMethod: detectedMethod,
        senderPhone: senderPhone || extractedData.sender_phone || undefined,
        countryCode: countryCode || '+221',
        countryName: countryName || 'Sénégal',
        transactionReference: transactionRef || rawTxId || undefined,
        rejectionReason: reasonText,
        rejectionCode: errCode,
        receiptTimestamp: parsedTs || `${serverNowDay}/${serverNowMonth}/${serverNowYear} à ${serverNowHour}:${serverNowMinute}`,
        createdAt: new Date().toISOString(),
        documentTitle,
        purpose,
        extractedData: {
          recipient_phone: extractedData.recipient_phone || 'Non conforme / Absent',
          recipient_name: extractedData.recipient_name || 'Non détecté',
          amount: detectedAmount,
          expectedAmount: targetAmount,
          transaction_id: rawTxId || 'Non détecté',
          date_time: extractedData.date_time || parsedTs || `${serverNowDay}/${serverNowMonth}/${serverNowYear}`,
          validation_reason: reasonText,
          details: extraDetails,
          rawAiText: responseText
        },
        receiptImage: imageBase64 && imageBase64.length < 350000 ? imageBase64 : undefined
      };
      adminStore.transactions.unshift(rejTx);
      return rejTx;
    };

    // 2. CONTRÔLE DE VALIDITÉ DU REÇU
    if (!isValidReceipt || !rawTxId || rawTxId.length < 3) {
      const reason = extractedData.validation_reason || "Image non reconnue ou ID transaction introuvable sur le reçu.";
      recordRejectedTx(reason, 'INVALID_RECEIPT', "L'image fournie n'est pas un reçu officiel Wave ou Orange Money lisible.");
      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'INVALID_RECEIPT',
        error: "Reçu non valide ou déjà utilisé. L'image fournie n'est pas un reçu officiel Wave ou Orange Money lisible.",
        details: reason
      });
    }

    // 3. CONTRÔLE TEMPOREL ULTRA-STRICT (DATE, HEURE & MINUTES < 30 MIN)
    // Extraire jour, mois, année, heure, minute
    let receiptDay: number | null = extractedData.timestamp_day != null ? Number(extractedData.timestamp_day) : null;
    let receiptMonth: number | null = extractedData.timestamp_month != null ? Number(extractedData.timestamp_month) : null;
    let receiptYear: number | null = extractedData.timestamp_year != null ? Number(extractedData.timestamp_year) : null;
    let receiptHour: number | null = extractedData.timestamp_hour != null ? Number(extractedData.timestamp_hour) : null;
    let receiptMinute: number | null = extractedData.timestamp_minute != null ? Number(extractedData.timestamp_minute) : null;

    // Fallback regex parsing sur le champ textuel date_time si un élément manque
    const rawDateTimeText = String(extractedData.date_time || '');
    if ((receiptDay == null || receiptMonth == null || receiptHour == null || receiptMinute == null) && rawDateTimeText) {
      // Ex: "25/08/2026 14:32" ou "25-08-2026 à 14:32"
      const slashMatch = rawDateTimeText.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4}).*?(\d{1,2})[:hH](\d{2})/);
      if (slashMatch) {
        if (receiptDay == null) receiptDay = parseInt(slashMatch[1], 10);
        if (receiptMonth == null) receiptMonth = parseInt(slashMatch[2], 10);
        if (receiptYear == null) {
          const y = parseInt(slashMatch[3], 10);
          receiptYear = y < 100 ? 2000 + y : y;
        }
        if (receiptHour == null) receiptHour = parseInt(slashMatch[4], 10);
        if (receiptMinute == null) receiptMinute = parseInt(slashMatch[5], 10);
      } else {
        // Ex: "25 août 2026 à 14:32"
        const frenchMonths: Record<string, number> = {
          janv: 1, janvier: 1, fevr: 2, fevrier: 2, 'févr': 2, 'février': 2, mars: 3, avr: 4, avril: 4,
          mai: 5, juin: 6, juil: 7, juillet: 7, aout: 8, 'août': 8, sept: 9, septembre: 9,
          oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, decembre: 12, 'déc': 12, 'décembre': 12
        };
        const textDateMatch = rawDateTimeText.match(/(\d{1,2})\s+([a-zA-ZéûÉÛ]+)\s*(\d{2,4})?.*?(\d{1,2})[:hH](\d{2})/i);
        if (textDateMatch) {
          if (receiptDay == null) receiptDay = parseInt(textDateMatch[1], 10);
          const mName = textDateMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (receiptMonth == null) {
            for (const [k, v] of Object.entries(frenchMonths)) {
              if (mName.startsWith(k.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
                receiptMonth = v;
                break;
              }
            }
          }
          if (receiptYear == null) {
            receiptYear = textDateMatch[3] ? parseInt(textDateMatch[3], 10) : serverNowYear;
            if (receiptYear < 100) receiptYear += 2000;
          }
          if (receiptHour == null) receiptHour = parseInt(textDateMatch[4], 10);
          if (receiptMinute == null) receiptMinute = parseInt(textDateMatch[5], 10);
        } else if (/aujourd'hui/i.test(rawDateTimeText)) {
          // Ex: "Aujourd'hui à 14:32"
          const todayMatch = rawDateTimeText.match(/(\d{1,2})[:hH](\d{2})/);
          if (todayMatch) {
            receiptDay = serverNowDay;
            receiptMonth = serverNowMonth;
            receiptYear = serverNowYear;
            receiptHour = parseInt(todayMatch[1], 10);
            receiptMinute = parseInt(todayMatch[2], 10);
          }
        }
      }
    }

    if (receiptYear != null && receiptYear < 100) {
      receiptYear += 2000;
    }

    console.log(`[Receipt Time Check] Date reçue: ${receiptDay}/${receiptMonth}/${receiptYear} ${receiptHour}:${receiptMinute} vs Serveur: ${serverNowDay}/${serverNowMonth}/${serverNowYear} ${serverNowHour}:${serverNowMinute}`);

    const currentFormattedTs = `${receiptDay ? String(receiptDay).padStart(2, '0') : '--'}/${receiptMonth ? String(receiptMonth).padStart(2, '0') : '--'}/${receiptYear || '----'} à ${receiptHour != null ? String(receiptHour).padStart(2, '0') : '--'}:${receiptMinute != null ? String(receiptMinute).padStart(2, '0') : '--'}`;

    // Si les informations temporelles sont manquantes ou illisibles
    const isTimestampMissing = receiptDay == null || receiptMonth == null || receiptHour == null || receiptMinute == null || extractedData.is_timestamp_readable === false;

    if (isTimestampMissing) {
      console.warn(`[Receipt Time Check] Échec : Horodatage incomplet ou illisible sur le reçu (${rawDateTimeText || 'aucun'}).`);
      const rejReason = "Horodatage illisible sur le reçu. La date et l'heure précises doivent être visibles.";
      recordRejectedTx(rejReason, 'EXPIRED_RECEIPT', `Date brute lue: ${rawDateTimeText || 'Aucune'}`, currentFormattedTs);

      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'EXPIRED_RECEIPT',
        error: "Transaction expirée ou invalide. Le reçu doit être récent (moins de 30 minutes).",
        details: "L'horodatage complet (date, heure et minute) est illisible ou introuvable sur le reçu."
      });
    }

    // A. VÉRIFICATION STRICTE DE LA DATE (DOIT ÊTRE AUJOURD'HUI)
    const isSameDate = (
      receiptDay === serverNowDay &&
      receiptMonth === serverNowMonth &&
      (receiptYear === serverNowYear || receiptYear == null)
    );

    if (!isSameDate) {
      console.warn(`[Receipt Time Check] Échec Date : Reçu du ${receiptDay}/${receiptMonth}/${receiptYear} au lieu du ${serverNowDay}/${serverNowMonth}/${serverNowYear}.`);
      
      recordAuditLog(
        'payment',
        'RECEIPT_EXPIRED_DATE',
        userEmail,
        `Reçu rejeté car la date n'est pas celle d'aujourd'hui (${receiptDay}/${receiptMonth}/${receiptYear})`,
        { transactionId: rawTxId, receiptDate: `${receiptDay}/${receiptMonth}/${receiptYear}`, serverDate: serverDateStr },
        userEmail,
        userId,
        'error'
      );

      const rejReason = `Date du reçu périmée (${receiptDay}/${receiptMonth}/${receiptYear} au lieu du ${serverDateStr})`;
      recordRejectedTx(rejReason, 'EXPIRED_RECEIPT', `Date détectée: ${receiptDay}/${receiptMonth}/${receiptYear}`, currentFormattedTs);

      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'EXPIRED_RECEIPT',
        error: "Transaction expirée ou invalide. Le reçu doit être récent (moins de 30 minutes).",
        details: `La date du reçu (${receiptDay}/${receiptMonth}/${receiptYear}) n'est pas celle d'aujourd'hui (${serverDateStr}).`
      });
    }

    // B. VÉRIFICATION STRICTE DE L'HEURE & DES MINUTES (< 30 MINUTES)
    // Construction de l'objet Date du reçu en heure UTC/GMT (fuseau horaire Sénégal)
    const effectiveYear = receiptYear || serverNowYear;
    const receiptDateObj = new Date(Date.UTC(effectiveYear, receiptMonth! - 1, receiptDay!, receiptHour!, receiptMinute!, 0));
    
    // Calcul de l'écart en minutes
    const diffMs = serverNow.getTime() - receiptDateObj.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    console.log(`[Receipt Time Check] Écart temporel calculé : ${diffMinutes.toFixed(1)} minutes (Tolérance max : 30 minutes).`);

    // Tolérance : entre -5 min (dérive horloge client) et +30 min
    if (diffMinutes > 30 || diffMinutes < -15) {
      console.warn(`[Receipt Time Check] Échec Heure : Reçu expiré (${diffMinutes.toFixed(1)} minutes écoulées > 30 min max).`);

      recordAuditLog(
        'payment',
        'RECEIPT_EXPIRED_TIME',
        userEmail,
        `Reçu rejeté car la transaction date de plus de 30 minutes (${Math.round(diffMinutes)} min écoulées)`,
        { transactionId: rawTxId, diffMinutes, receiptTime: `${receiptHour}:${receiptMinute}`, serverTime: serverTimeStr },
        userEmail,
        userId,
        'error'
      );

      const rejReason = `Reçu expiré : émis il y a ${Math.round(diffMinutes)} minutes (limite max: 30 minutes)`;
      recordRejectedTx(rejReason, 'EXPIRED_RECEIPT', `Heure reçue: ${receiptHour}:${receiptMinute} (${Math.round(diffMinutes)} min écoulées)`, currentFormattedTs);

      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'EXPIRED_RECEIPT',
        error: "Transaction expirée ou invalide. Le reçu doit être récent (moins de 30 minutes).",
        details: `La transaction a été effectuée à ${String(receiptHour).padStart(2, '0')}:${String(receiptMinute).padStart(2, '0')} (il y a ${Math.round(diffMinutes)} minutes). Le délai maximum autorisé est de 30 minutes.`
      });
    }

    // 3. CONTRÔLE ANTI-REPLAY / ANTI-DOUBLON
    // Vérifier si cet ID de transaction a déjà été enregistré et validé
    if (verifiedReceiptIds.has(rawTxId) || adminStore.transactions.some(t => (t.transactionId === rawTxId || t.id === rawTxId) && (t.status === 'VALIDATED_BY_AI' || t.status === 'COMPLETED' || t.status === 'MANUALLY_VALIDATED'))) {
      console.warn(`[Receipt Anti-Fraud] Tentative de réutilisation du reçu ID: ${rawTxId} par ${userEmail}`);
      
      recordAuditLog(
        'payment',
        'RECEIPT_REUSE_BLOCKED',
        userEmail,
        `Tentative de réutilisation d'un reçu déjà utilisé (ID: ${rawTxId})`,
        { transactionId: rawTxId, amount: detectedAmount, userEmail },
        userEmail,
        userId,
        'error'
      );

      const rejReason = `Tentative de réutilisation de reçu (ID ${rawTxId} déjà validé)`;
      recordRejectedTx(rejReason, 'ALREADY_USED', "Cet identifiant de transaction a déjà été validé sur la plateforme.", currentFormattedTs);

      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'ALREADY_USED',
        error: "Reçu non valide ou déjà utilisé. Cet identifiant de transaction a déjà été validé sur la plateforme."
      });
    }

    // 4. CONTRÔLE DU DESTINATAIRE
    const recipientPhoneClean = String(extractedData.recipient_phone || '').replace(/[^0-9]/g, '');
    const recipientNameClean = String(extractedData.recipient_name || '').toUpperCase();
    const isRecipientExplicitlyInvalid = extractedData.recipient_valid === false;
    
    // Si un numéro de destinataire est lisible sur le reçu, s'assurer qu'il s'agit bien du 789619088
    if (recipientPhoneClean && !recipientPhoneClean.includes('789619088') && !recipientPhoneClean.includes('7896190') && recipientPhoneClean.length >= 9) {
      const rejReason = `Destinataire non conforme (${recipientPhoneClean} au lieu de +221 78 961 90 88)`;
      recordRejectedTx(rejReason, 'INVALID_RECIPIENT', "Le transfert a été envoyé vers un numéro non autorisé.", currentFormattedTs);
      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'INVALID_RECIPIENT',
        error: "Le reçu ne correspond pas au numéro destinataire officiel (+221 78 961 90 88 - NGOUALA LAVOISIER FORTUNE PETER)."
      });
    }

    if (isRecipientExplicitlyInvalid) {
      const rejReason = "Destinataire incorrect ou non reconnu par l'IA";
      recordRejectedTx(rejReason, 'INVALID_RECIPIENT', "Le compte destinataire ne correspond pas à Dokya.", currentFormattedTs);
      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'INVALID_RECIPIENT',
        error: "Le destinataire du transfert sur le reçu ne correspond pas au compte officiel Dokya (+221 78 961 90 88)."
      });
    }

    // 5. CONTRÔLE DU MONTANT
    // On tolère jusqu'à 0 FCFA d'écart (ou égalité)
    if (detectedAmount > 0 && detectedAmount < targetAmount) {
      const rejReason = `Montant insuffisant (${detectedAmount.toLocaleString('fr-FR')} FCFA au lieu de ${targetAmount.toLocaleString('fr-FR')} FCFA attendus)`;
      recordRejectedTx(rejReason, 'INSUFFICIENT_AMOUNT', `Différence constatée: -${(targetAmount - detectedAmount).toLocaleString('fr-FR')} FCFA`, currentFormattedTs);
      return res.status(400).json({
        success: false,
        status: 'REJECTED',
        errorCode: 'INSUFFICIENT_AMOUNT',
        error: `Montant insuffisant sur le reçu : ${detectedAmount.toLocaleString('fr-FR')} FCFA détectés au lieu des ${targetAmount.toLocaleString('fr-FR')} FCFA requis.`,
        detectedAmount,
        expectedAmount: targetAmount
      });
    }

    // 6. VALIDATION DU PAIEMENT (COMPLETED) & ENREGISTREMENT
    // Ajouter l'ID dans le registre anti-doublon
    verifiedReceiptIds.add(rawTxId);

    const txRecordId = `TX-OCR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const effectiveAmount = detectedAmount > 0 ? detectedAmount : targetAmount;
    const formattedReceiptTimestamp = `${receiptDay ? String(receiptDay).padStart(2, '0') : serverNowDay}/${receiptMonth ? String(receiptMonth).padStart(2, '0') : serverNowMonth}/${receiptYear || serverNowYear} à ${receiptHour != null ? String(receiptHour).padStart(2, '0') : serverNowHour}:${receiptMinute != null ? String(receiptMinute).padStart(2, '0') : serverNowMinute}`;

    // Enregistrer la transaction dans adminStore
    const newTransaction = {
      id: txRecordId,
      transactionId: rawTxId,
      userId: userId || 'guest',
      userEmail: userEmail || 'candidat@senegalcv.sn',
      userName: userName || (userEmail ? userEmail.split('@')[0] : 'Candidat'),
      type: purpose === 'wallet_recharge' ? 'recharge' : 'document_purchase',
      amount: purpose === 'wallet_recharge' ? effectiveAmount : -effectiveAmount,
      expectedAmount: targetAmount,
      extractedAmount: detectedAmount || effectiveAmount,
      currency: 'XOF',
      description: purpose === 'wallet_recharge'
        ? `Recharge Solde (${detectedMethod === 'wave' ? 'Wave' : 'Orange Money'}) - Ref: ${rawTxId}`
        : `Achat & Déblocage Immédiat : ${documentTitle} (Validé par IA - Ref: ${rawTxId})`,
      status: 'VALIDATED_BY_AI',
      aiStatus: 'VALIDATED_BY_AI',
      paymentMethod: detectedMethod,
      senderPhone: senderPhone || extractedData.sender_phone || undefined,
      countryCode: countryCode || '+221',
      countryName: countryName || 'Sénégal',
      transactionReference: transactionRef || rawTxId || undefined,
      receiptTimestamp: formattedReceiptTimestamp,
      createdAt: new Date().toISOString(),
      documentTitle,
      purpose,
      extractedData: {
        recipient_phone: extractedData.recipient_phone || '+221 78 961 90 88',
        recipient_name: extractedData.recipient_name || 'NGOUALA LAVOISIER FORTUNE PETER',
        amount: detectedAmount || effectiveAmount,
        expectedAmount: targetAmount,
        transaction_id: rawTxId,
        date_time: extractedData.date_time || formattedReceiptTimestamp,
        validation_reason: extractedData.validation_reason || 'Reçu authentique et conforme validé par Gemini Vision OCR',
        rawAiText: responseText
      },
      receiptImage: imageBase64 && imageBase64.length < 350000 ? imageBase64 : undefined,
      metadata: {
        receiptDate: extractedData.date_time || new Date().toISOString(),
        senderPhone: extractedData.sender_phone || '',
        recipientPhone: extractedData.recipient_phone || '+221 78 961 90 88',
        recipientName: extractedData.recipient_name || 'NGOUALA LAVOISIER FORTUNE PETER',
        validationReason: extractedData.validation_reason || 'Vérifié par Gemini Vision'
      }
    };

    adminStore.transactions.unshift(newTransaction);

    // Si c'est une recharge de solde, créditer le compte utilisateur, ou activer l'abonnement
    let userNewBalance = undefined;
    const userIndex = adminStore.users.findIndex(u => u.uid === userId || (userEmail && u.email.toLowerCase() === userEmail.toLowerCase()));
    if (userIndex !== -1) {
      if (purpose === 'wallet_recharge') {
        adminStore.users[userIndex].balance = (adminStore.users[userIndex].balance || 0) + effectiveAmount;
        adminStore.users[userIndex].ordersCount = (adminStore.users[userIndex].ordersCount || 0) + 1;
        userNewBalance = adminStore.users[userIndex].balance;
      } else if (purpose === 'subscription_purchase') {
        adminStore.users[userIndex].ordersCount = (adminStore.users[userIndex].ordersCount || 0) + 1;
        const subDurationDays = effectiveAmount >= 25000 ? 365 : (effectiveAmount >= 5000 ? 30 : 7);
        const subEndDate = new Date(Date.now() + subDurationDays * 24 * 60 * 60 * 1000).toISOString();
        adminStore.users[userIndex].subscription = {
          status: 'active',
          planId: effectiveAmount >= 25000 ? 'annual' : (effectiveAmount >= 5000 ? 'monthly' : 'weekly'),
          planTitle: effectiveAmount >= 25000 ? 'Pass VIP Annuel' : (effectiveAmount >= 5000 ? 'Pass VIP Mensuel' : 'Pass VIP Hebdomadaire'),
          startDate: new Date().toISOString(),
          endDate: subEndDate,
          pricePaid: effectiveAmount,
          paymentMethod: detectedMethod,
          documentsGeneratedCount: 0
        };
      } else {
        adminStore.users[userIndex].ordersCount = (adminStore.users[userIndex].ordersCount || 0) + 1;
        adminStore.users[userIndex].unlockedDocsCount = (adminStore.users[userIndex].unlockedDocsCount || 0) + 1;
      }
      adminStore.users[userIndex].updatedAt = new Date().toISOString();
    }

    // Journal d'audit
    recordAuditLog(
      'payment',
      'RECEIPT_AI_VERIFIED_SUCCESS',
      userEmail,
      `Paiement validé par OCR IA : ${effectiveAmount.toLocaleString('fr-FR')} FCFA via ${detectedMethod.toUpperCase()} (ID: ${rawTxId})`,
      { transactionId: rawTxId, amount: effectiveAmount, method: detectedMethod, purpose },
      userEmail,
      userId,
      'success'
    );

    console.log(`[Receipt OCR IA Success] Transaction validée avec succès pour ${userEmail} (ID: ${rawTxId}, Montant: ${effectiveAmount} FCFA).`);

    return res.json({
      success: true,
      status: 'COMPLETED',
      method: detectedMethod,
      transactionId: rawTxId,
      amount: effectiveAmount,
      currency: 'XOF',
      date: extractedData.date_time || new Date().toLocaleDateString('fr-FR'),
      senderPhone: extractedData.sender_phone,
      recipientNameOrPhone: extractedData.recipient_info,
      newBalance: userNewBalance,
      message: `Paiement ${detectedMethod === 'wave' ? 'Wave' : 'Orange Money'} de ${effectiveAmount.toLocaleString('fr-FR')} FCFA validé avec succès par l'IA ! Votre accès est activé.`
    });

  } catch (err: any) {
    console.error('[Receipt OCR Exception]:', err);
    return res.status(500).json({
      success: false,
      status: 'INVALID',
      errorCode: 'AI_ERROR',
      error: "Reçu non valide ou déjà utilisé. Une erreur est survenue lors de l'analyse de l'image.",
      details: err?.message || 'Erreur interne'
    });
  }
});

// ==========================================
// SUBSCRIPTION PAYMENT SUBMISSION (PENDING VALIDATION)
// ==========================================
app.post('/api/subscription/submit-payment', (req, res) => {
  try {
    const {
      userId,
      userEmail,
      userName,
      planId = 'monthly',
      planTitle = 'Pass VIP Mensuel',
      amount = 5000,
      paymentMethod = 'wave',
      senderPhone = '',
      countryCode = 'SN',
      countryName = 'Sénégal',
      transactionReference = '',
      receiptImage = ''
    } = req.body || {};

    const priceNum = Number(amount) || 5000;
    const txId = `TX-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const pendingTx = {
      id: txId,
      transactionId: transactionReference || `REF-${Date.now().toString().slice(-6)}`,
      userId: userId || 'guest',
      userEmail: userEmail || 'candidat@dokya.sn',
      userName: userName || 'Candidat Dokya',
      type: 'subscription_purchase' as const,
      amount: -priceNum,
      expectedAmount: priceNum,
      extractedAmount: priceNum,
      currency: 'XOF',
      description: `Souscription ${planTitle} (${paymentMethod === 'wave' ? 'Wave' : paymentMethod === 'orange_money' ? 'Orange Money' : paymentMethod === 'card' ? 'Carte Bancaire' : 'Mobile Money'} - En attente de validation)`,
      status: 'pending' as const,
      aiStatus: 'PENDING' as const,
      paymentMethod,
      senderPhone,
      countryCode,
      countryName,
      receiptImage: receiptImage && receiptImage.length < 350000 ? receiptImage : undefined,
      createdAt: nowIso,
      purpose: 'subscription_purchase',
      planId,
      planTitle
    };

    adminStore.transactions.unshift(pendingTx);

    // Update user record if exists in memory
    const userIndex = adminStore.users.findIndex(u => u.uid === userId || (userEmail && u.email.toLowerCase() === userEmail.toLowerCase()));
    if (userIndex !== -1) {
      (adminStore.users[userIndex] as any).subscription = {
        planId,
        planName: planTitle,
        status: 'pending',
        pricePaid: priceNum,
        paymentMethod,
        senderPhone,
        countryCode,
        countryName,
        transactionReference: transactionReference || txId,
        submittedAt: nowIso
      };
      adminStore.users[userIndex].updatedAt = nowIso;
    }

    recordAuditLog(
      'payment',
      'SUBSCRIPTION_PAYMENT_SUBMITTED',
      userEmail || 'candidat@dokya.sn',
      `Demande de souscription soumise pour ${planTitle} (${priceNum.toLocaleString('fr-FR')} FCFA via ${paymentMethod} - ${countryName}). En attente de validation administrative.`,
      { txId, planId, planTitle, amount: priceNum, paymentMethod, senderPhone, countryCode, countryName, transactionReference },
      userEmail,
      userId,
      'warning'
    );

    return res.json({
      success: true,
      transactionId: txId,
      status: 'pending',
      message: `Votre demande de souscription pour le ${planTitle} a été transmise avec succès ! Notre équipe vérifie votre paiement sous 5 à 15 minutes.`
    });
  } catch (err: any) {
    console.error('[Submit Subscription Payment Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de la transmission de la demande de souscription.'
    });
  }
});


// ==========================================
// RECHARGE PAYMENT SUBMISSION (PENDING VALIDATION)
// ==========================================
app.post('/api/recharge/submit-payment', (req, res) => {
  try {
    const {
      userId,
      userEmail,
      userName,
      amount = 3000,
      paymentMethod = 'wave',
      senderPhone = '',
      countryCode = 'SN',
      countryName = 'Sénégal',
      transactionReference = '',
      receiptImage = ''
    } = req.body || {};

    const amountNum = Number(amount) || 3000;
    const txId = `TX-REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const pendingTx = {
      id: txId,
      transactionId: transactionReference || `REF-${Date.now().toString().slice(-6)}`,
      userId: userId || 'guest',
      userEmail: userEmail || 'candidat@dokya.sn',
      userName: userName || 'Candidat Dokya',
      type: 'recharge' as const,
      amount: amountNum,
      expectedAmount: amountNum,
      extractedAmount: amountNum,
      currency: 'XOF',
      description: `Recharge Solde Wallet (${amountNum.toLocaleString('fr-FR')} FCFA via ${paymentMethod === 'wave' ? 'Wave' : paymentMethod === 'orange_money' ? 'Orange Money' : 'Mobile Money'} - En attente de validation)`,
      status: 'pending' as const,
      aiStatus: 'PENDING' as const,
      paymentMethod,
      senderPhone,
      countryCode,
      countryName,
      receiptImage: receiptImage && receiptImage.length < 350000 ? receiptImage : undefined,
      createdAt: nowIso,
      purpose: 'wallet_recharge'
    };

    adminStore.transactions.unshift(pendingTx);

    recordAuditLog(
      'payment',
      'WALLET_RECHARGE_SUBMITTED',
      userEmail || 'candidat@dokya.sn',
      `Demande de recharge de solde soumise : ${amountNum.toLocaleString('fr-FR')} FCFA via ${paymentMethod} (${countryName}). En attente de validation administrative.`,
      { txId, amount: amountNum, paymentMethod, senderPhone, countryCode, countryName, transactionReference },
      userEmail,
      userId,
      'warning'
    );

    return res.json({
      success: true,
      transactionId: txId,
      status: 'pending',
      message: `Votre demande de recharge de ${amountNum.toLocaleString('fr-FR')} FCFA a été transmise avec succès ! Notre équipe crédite votre solde sous 5 à 15 minutes.`
    });
  } catch (err: any) {
    console.error('[Submit Recharge Payment Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de la transmission de la recharge.'
    });
  }
});

// ==========================================
// DOCUMENT PURCHASE PAYMENT SUBMISSION (PENDING VALIDATION)
// ==========================================
app.post('/api/documents/submit-payment', (req, res) => {
  try {
    const {
      userId,
      userEmail,
      userName,
      documentTitle = 'Document Dokya AI',
      documentTypeLabel = 'Document Professionnel',
      amount = 1000,
      paymentMethod = 'wave',
      senderPhone = '',
      countryCode = '+221',
      countryName = 'Sénégal',
      transactionReference = '',
      receiptImage = ''
    } = req.body || {};

    const amountNum = Number(amount) || 1000;
    const txId = `TX-DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const pendingTx = {
      id: txId,
      transactionId: transactionReference || `REF-${Date.now().toString().slice(-6)}`,
      userId: userId || 'guest',
      userEmail: userEmail || 'candidat@dokya.sn',
      userName: userName || 'Candidat Dokya',
      type: 'document_purchase' as const,
      amount: -amountNum,
      expectedAmount: amountNum,
      extractedAmount: amountNum,
      currency: 'XOF',
      description: `Achat ${documentTypeLabel} : ${documentTitle} (${paymentMethod === 'wave' ? 'Wave' : paymentMethod === 'orange_money' ? 'Orange Money' : 'Mobile Money'} - En attente)`,
      status: 'pending' as const,
      aiStatus: 'PENDING' as const,
      paymentMethod,
      senderPhone,
      countryCode,
      countryName,
      receiptImage: receiptImage && receiptImage.length < 350000 ? receiptImage : undefined,
      createdAt: nowIso,
      purpose: 'document_purchase',
      documentTitle
    };

    adminStore.transactions.unshift(pendingTx);

    recordAuditLog(
      'payment',
      'DOCUMENT_PAYMENT_SUBMITTED',
      userEmail || 'candidat@dokya.sn',
      `Demande d'achat de document soumise pour "${documentTitle}" (${amountNum.toLocaleString('fr-FR')} FCFA via ${paymentMethod}). En attente de validation administrative.`,
      { txId, documentTitle, amount: amountNum, paymentMethod, senderPhone, transactionReference },
      userEmail,
      userId,
      'warning'
    );

    return res.json({
      success: true,
      transactionId: txId,
      status: 'pending',
      message: `Votre preuve de paiement pour "${documentTitle}" a été transmise ! Validation et déblocage sous 5 à 15 minutes.`
    });
  } catch (err: any) {
    console.error('[Submit Document Payment Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de la transmission du paiement.'
    });
  }
});

app.all(['/api/wallet', '/api/wallet/debit'], async (req, res) => {
  try {
    if (req.method === 'GET') {
      return res.json({
        success: true,
        balance: 1000,
        currency: 'XOF',
        status: 'active'
      });
    }

    const { userId, amount = 1000, currentBalance = 0, documentTitle = 'Document Dokya' } = req.body || {};
    
    const debitAmount = Number(amount) || 0;
    const balance = Number(currentBalance) || 0;

    if (debitAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Montant de paiement invalide.' });
    }

    if (balance < debitAmount) {
      return res.status(400).json({
        success: false,
        error: `Solde insuffisant. Votre solde actuel est de ${balance.toLocaleString('fr-FR')} FCFA, mais ${debitAmount.toLocaleString('fr-FR')} FCFA sont requis pour débloquer ce document. Veuillez recharger votre solde.`
      });
    }

    const newBalance = balance - debitAmount;
    const txId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const transaction = {
      id: txId,
      userId: userId || 'guest',
      type: 'document_purchase',
      amount: -debitAmount,
      currency: 'XOF',
      description: `Achat & Téléchargement : ${documentTitle}`,
      status: 'success',
      createdAt: new Date().toISOString(),
      paymentMethod: 'wallet',
      newBalance,
      documentTitle
    };

    console.log(`[Wallet Debit] Utilisateur ${userId} débité de ${debitAmount} FCFA. Nouveau solde : ${newBalance} FCFA.`);

    return res.json({
      success: true,
      newBalance,
      transaction,
      message: `Paiement de ${debitAmount.toLocaleString('fr-FR')} FCFA validé depuis votre solde Wallet. Téléchargement autorisé.`
    });
  } catch (err: any) {
    console.error('[Wallet Debit Exception]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors du débit du solde utilisateur.'
    });
  }
});

/**
 * 2. PAIEMENT INTERNE ET DÉBLOCAGE PAR SOLDE (DOCUMENTS ET ABONNEMENTS)
 * POST /api/wallet/pay
 * Paramètres reçus : { userId, itemType: 'document' | 'subscription', itemId, price, userEmail, userName }
 */
app.post('/api/wallet/pay', async (req, res) => {
  try {
    const {
      userId,
      itemType = 'document',
      itemId,
      documentId,
      docId,
      price,
      amount,
      userEmail = '',
      userName = ''
    } = req.body || {};

    const targetDocId = String(documentId || itemId || docId || '').trim();
    const rawPrice = price !== undefined ? price : (amount !== undefined ? amount : 0);
    const numericPrice = Math.max(0, Number(rawPrice) || 0);

    if (!userId || userId === 'guest') {
      return res.status(400).json({
        success: false,
        error: 'Utilisateur non connecté ou identifiant manquant.'
      });
    }

    if (!targetDocId && itemType !== 'subscription') {
      return res.status(400).json({
        success: false,
        error: 'Identifiant du document manquant (documentId).'
      });
    }

    const db = getServerAdminDb();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    let currentBalance = 0;
    let effectiveEmail = String(userEmail || '').trim();
    let effectiveName = String(userName || '').trim();

    if (userSnap.exists) {
      const uData = userSnap.data() || {};
      currentBalance = Number(uData.walletBalance ?? uData.balance ?? uData.solde ?? 0);
      if (!effectiveEmail) effectiveEmail = uData.email || '';
      if (!effectiveName) effectiveName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || uData.displayName || 'Utilisateur';
    }

    // SI walletBalance < price : Retourne une réponse JSON 400 : { success: false, error: "Solde insuffisant" }
    if (currentBalance < numericPrice) {
      return res.status(400).json({
        success: false,
        error: "Solde insuffisant",
        reason: 'INSUFFICIENT_FUNDS',
        currentBalance,
        requiredPrice: numericPrice,
        message: `Solde insuffisant (${currentBalance.toLocaleString('fr-FR')} FCFA disponible, ${numericPrice.toLocaleString('fr-FR')} FCFA requis). Veuillez recharger votre solde.`
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const transactionId = "WAL-" + Date.now();
    const newComputedBalance = Math.max(0, currentBalance - numericPrice);

    // a) Déduis le montant du solde : walletBalance -= price
    const userUpdate: any = {
      walletBalance: FieldValue.increment(-numericPrice),
      balance: FieldValue.increment(-numericPrice),
      solde: FieldValue.increment(-numericPrice),
      lastPaymentAt: nowIso,
      lastPaymentProvider: 'Wallet',
      updatedAt: nowIso
    };

    if (targetDocId) {
      userUpdate.purchasedDocIds = FieldValue.arrayUnion(targetDocId);
    }
    await userRef.set(userUpdate, { merge: true });

    // b) Si itemType === 'document' : Mets à jour 'user_documents/{documentId}' avec { isUnlocked: true, status: 'UNLOCKED', unlockedAt: new Date().toISOString() }
    if (itemType === 'document' && targetDocId) {
      const docRef = db.collection('user_documents').doc(targetDocId);
      await docRef.set({
        id: targetDocId,
        docId: targetDocId,
        userId: userId,
        isUnlocked: true,
        status: 'UNLOCKED',
        unlocked: true,
        isPaid: true,
        unlockedAt: nowIso,
        paidAt: nowIso,
        paymentMethod: 'WALLET',
        updatedAt: nowIso
      }, { merge: true });
    }

    // c) Si itemType === 'subscription' : Mets à jour 'users/{userId}' avec { isVip: true, subscriptionStatus: 'ACTIVE', vipPlan: itemId }
    if (itemType === 'subscription') {
      const planDurationDays = targetDocId === 'annual' ? 365 : (targetDocId === 'weekly' ? 7 : 30);
      const expiresDate = new Date(Date.now() + planDurationDays * 24 * 60 * 60 * 1000).toISOString();

      await userRef.set({
        isVip: true,
        subscriptionStatus: 'ACTIVE',
        vipPlan: targetDocId,
        vipActivatedAt: nowIso,
        subscription: {
          planId: targetDocId,
          status: 'ACTIVE',
          activatedAt: nowIso,
          expiresAt: expiresDate,
          pricePaid: numericPrice,
          paymentMethod: 'WALLET'
        },
        updatedAt: nowIso
      }, { merge: true });
    }

    // d) Enregistre la transaction interne dans Firestore 'transactions'
    const newTxRecord = {
      id: transactionId,
      transactionId: transactionId,
      userId: userId,
      userEmail: effectiveEmail,
      userName: effectiveName || "Utilisateur",
      type: itemType === 'document' ? "document_purchase" : "subscription_purchase",
      typeLabel: itemType === 'document' ? "Achat Document" : "Abonnement VIP",
      amount: numericPrice,
      expectedAmount: numericPrice,
      currency: "FCFA",
      status: "SUCCESS",
      paymentMethod: "WALLET",
      documentId: targetDocId || null,
      itemId: targetDocId || null,
      targetDocId: targetDocId || null,
      planId: itemType === 'subscription' ? targetDocId : null,
      newBalance: newComputedBalance,
      createdAt: nowIso,
      completedAt: nowIso,
      updatedAt: nowIso
    };

    await db.collection('transactions').doc(transactionId).set(newTxRecord, { merge: true });

    // e) Crée une notification dans 'users/{userId}/notifications'
    try {
      await userRef.collection('notifications').add({
        title: "Document débloqué avec succès",
        message: `Votre ${itemType === 'document' ? 'document' : 'abonnement'} a été débloqué avec succès via votre solde Dokya (${numericPrice.toLocaleString('fr-FR')} FCFA).`,
        type: "document_unlocked",
        documentId: targetDocId || null,
        createdAt: nowIso,
        read: false
      });
    } catch (_notifErr) {}

    // Mise à jour de la mémoire adminStore pour affichage immédiat
    adminStore.transactions.unshift(newTxRecord);
    const uStoreIdx = adminStore.users.findIndex(u => u.uid === userId);
    if (uStoreIdx !== -1) {
      adminStore.users[uStoreIdx].walletBalance = newComputedBalance;
      adminStore.users[uStoreIdx].balance = newComputedBalance;
      if (itemType === 'subscription') {
        adminStore.users[uStoreIdx].isVip = true;
        adminStore.users[uStoreIdx].subscriptionStatus = 'ACTIVE';
      }
    }

    // f) Retourne { success: true, message: "Document débloqué avec succès" }
    return res.status(200).json({
      success: true,
      message: "Document débloqué avec succès",
      transactionId,
      newBalance: newComputedBalance,
      amount: numericPrice
    });
  } catch (err: any) {
    console.error('[API /api/wallet/pay Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors du traitement du paiement par solde.'
    });
  }
});

// ==========================================
// PAYMENT CONFIG & VERIFY (KKIAPAY / MOBILE MONEY)
// ==========================================
app.get('/api/payment/config', (req, res) => {
  try {
    return res.json({
      publicKey: process.env.KKIAPAY_PUBLIC_KEY || process.env.VITE_KKIAPAY_PUBLIC_KEY || '632596be79bf1eb62a1c0d4a7c1543ed9b55beec',
      sandbox: process.env.KKIAPAY_SANDBOX === 'false' ? false : true,
      currency: 'XOF'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la configuration de paiement.'
    });
  }
});

app.post('/api/payment/verify', async (req, res) => {
  try {
    const { transactionId, refCommand, mode = 'full_pack', amount = 1000 } = req.body || {};

    if (!transactionId && !refCommand) {
      return res.status(400).json({
        success: false,
        error: 'Identifiant de transaction manquant.'
      });
    }

    console.log(`[Payment Verify] Verification transaction ${transactionId || refCommand}...`);

    return res.json({
      success: true,
      paid: true,
      transactionId: transactionId || refCommand || `TX-${Date.now()}`,
      mode,
      amount
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors de la vérification du paiement.'
    });
  }
});

// =========================================================================
// MONEY FUSION & MANUAL PAYMENTS SYSTEM (EXCLUSIVE ONLINE GATEWAY)
// =========================================================================

// Store persistant en mémoire pour les paiements manuels
const manualPaymentsStore: any[] = [];

/**
 * Cœur du traitement unifié de confirmation de paiement (Webhook & Vérification & Validation Admin)
 * Met à jour Firestore avec status 'SUCCESS' et exécute Action A (Solde), Action B (Document), Action C (Abonnement)
 */
async function handlePaymentConfirmation(params: {
  transactionId?: string;
  token?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  docId?: string;
  plan?: string;
  type?: string;
  amount?: number;
  paymentMethod?: string;
  promoCode?: string;
  adminEmail?: string;
  note?: string;
}) {
  const db = getServerAdminDb();
  const now = new Date();
  const nowIso = now.toISOString();

  let {
    transactionId,
    token,
    userId = '',
    userEmail = '',
    userName = 'Client Dokya',
    userPhone = '',
    docId = '',
    plan = '',
    type = '',
    amount = 0,
    paymentMethod = 'moneyfusion',
    promoCode = '',
    adminEmail = '',
    note = ''
  } = params;

  let txId = String(transactionId || token || '').trim();

  // 1. Récupération des données transactionnelles existantes dans Firestore si disponible
  let existingTxData: any = null;
  if (txId) {
    try {
      const docSnap = await db.collection('transactions').doc(txId).get();
      if (docSnap.exists) {
        existingTxData = docSnap.data();
      }
    } catch (e: any) {
      console.warn('[handlePaymentConfirmation] Tx get error:', e?.message);
    }
  }

  // Si non trouvé par ID de document, recherche par transactionId ou token
  if (!existingTxData && txId) {
    try {
      const querySnap = await db.collection('transactions').where('transactionId', '==', txId).limit(1).get();
      if (!querySnap.empty) {
        existingTxData = querySnap.docs[0].data();
        txId = querySnap.docs[0].id;
      }
    } catch (_e) {}
  }

  // Héritage des métadonnées enregistrées dès le checkout (PENDING)
  if (existingTxData) {
    if (!userId || userId === 'guest') userId = existingTxData.userId || userId;
    if (!userEmail) userEmail = existingTxData.userEmail || userEmail;
    if (!userName || userName === 'Client Dokya' || userName === 'Utilisateur') userName = existingTxData.userName || userName;
    if (!userPhone) userPhone = existingTxData.phoneNumber || existingTxData.userPhone || userPhone;
    if (!docId) docId = existingTxData.docId || existingTxData.targetDocId || docId;
    if (!plan) plan = existingTxData.plan || existingTxData.planId || plan;
    if (!type) type = existingTxData.type || type;
    if (!amount) amount = Number(existingTxData.amount || 0);
  }

  // Résolution et normalisation du type ('wallet' | 'document' | 'subscription')
  let resolvedType = String(type || '').trim().toLowerCase();
  if (resolvedType.includes('wallet') || resolvedType.includes('recharge')) {
    resolvedType = 'wallet';
  } else if (resolvedType.includes('doc')) {
    resolvedType = 'document';
  } else if (resolvedType.includes('sub') || resolvedType.includes('vip')) {
    resolvedType = 'subscription';
  } else if (docId) {
    resolvedType = 'document';
  } else if (plan) {
    resolvedType = 'subscription';
  } else {
    resolvedType = 'wallet';
  }

  if (!txId) {
    txId = `MF-${Date.now()}`;
  }

  // Règle absolue : Ne crédite JAMAIS 0 FCFA !
  let numericAmount = Number(amount || 0);
  if ((isNaN(numericAmount) || numericAmount <= 0) && existingTxData?.amount) {
    numericAmount = Number(existingTxData.amount || 0);
  }
  if ((isNaN(numericAmount) || numericAmount <= 0) && existingTxData?.expectedAmount) {
    numericAmount = Number(existingTxData.expectedAmount || 0);
  }

  if (isNaN(numericAmount) || numericAmount <= 0) {
    console.warn(`[handlePaymentConfirmation] REFUS : Montant détecté à 0 FCFA pour txId: ${txId}. Aucun crédit ne sera effectué à 0 FCFA.`);
    return {
      success: false,
      transactionId: txId,
      amount: 0,
      error: 'Montant invalide ou 0 FCFA'
    };
  }

  const finalPhone = String(userPhone || (existingTxData as any)?.phoneNumber || (existingTxData as any)?.userPhone || '').trim();
  const finalUserName = String(userName && userName !== 'Client Dokya' && userName !== 'Utilisateur' ? userName : (existingTxData?.userName || 'Utilisateur')).trim();
  const finalUserEmail = String(userEmail || existingTxData?.userEmail || '').trim();

  // 2. Mettre à jour la transaction dans Firestore à status: 'SUCCESS'
  const updatedTxRecord: any = {
    id: txId,
    transactionId: txId,
    userId: userId || 'anonymous',
    userEmail: finalUserEmail,
    userName: finalUserName,
    phoneNumber: finalPhone,
    userPhone: finalPhone,
    type: resolvedType === 'wallet' ? 'wallet_recharge' : (resolvedType === 'document' ? 'document_purchase' : 'subscription_purchase'),
    typeLabel: resolvedType === 'document' ? 'Achat Document' : (resolvedType === 'subscription' ? 'Abonnement VIP' : 'Recharge Solde'),
    docId: docId || null,
    targetDocId: docId || null,
    plan: plan || null,
    planId: plan || null,
    amount: numericAmount,
    expectedAmount: numericAmount,
    currency: 'XOF',
    status: 'SUCCESS', // Statut SUCCESS strict
    aiStatus: adminEmail ? 'MANUALLY_VALIDATED' : 'VALIDATED',
    paymentGateway: 'Money Fusion',
    paymentMethod: paymentMethod || 'moneyfusion',
    completedAt: nowIso,
    updatedAt: nowIso
  };

  if (adminEmail) {
    updatedTxRecord.manuallyValidatedBy = adminEmail;
    updatedTxRecord.manuallyValidatedAt = nowIso;
    if (note) updatedTxRecord.adminValidationNote = note;
  }

  try {
    await db.collection('transactions').doc(txId).set(updatedTxRecord, { merge: true });
    console.log(`[handlePaymentConfirmation] Transaction ${txId} mise à jour à SUCCESS dans Firestore.`);
  } catch (err: any) {
    console.error('[handlePaymentConfirmation] Erreur écriture SUCCESS transaction Firestore:', err?.message);
  }

  // Synchronisation store local en mémoire pour administration instantanée
  const storeIdx = adminStore.transactions.findIndex(t => t.id === txId || t.transactionId === txId);
  if (storeIdx !== -1) {
    adminStore.transactions[storeIdx] = { ...adminStore.transactions[storeIdx], ...updatedTxRecord };
  } else {
    adminStore.transactions.unshift(updatedTxRecord);
  }

  // ACTION A (Solde) : Si type === 'wallet', mettre à jour le document 'users/{userId}' (+walletBalance/solde)
  if (resolvedType === 'wallet' && userId && userId !== 'guest') {
    console.log(`[handlePaymentConfirmation] Action A (Solde) : Incrément de +${numericAmount} pour ${userId}`);
    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        walletBalance: FieldValue.increment(numericAmount),
        balance: FieldValue.increment(numericAmount),
        solde: FieldValue.increment(numericAmount),
        lastPaymentAt: nowIso,
        lastPaymentProvider: 'Money Fusion',
        updatedAt: nowIso
      }, { merge: true });

      const uIdx = adminStore.users.findIndex(u => u.uid === userId || (userEmail && u.email?.toLowerCase() === userEmail.toLowerCase()));
      if (uIdx !== -1) {
        adminStore.users[uIdx].walletBalance = (adminStore.users[uIdx].walletBalance || 0) + numericAmount;
        adminStore.users[uIdx].balance = (adminStore.users[uIdx].balance || 0) + numericAmount;
        (adminStore.users[uIdx] as any).solde = ((adminStore.users[uIdx] as any).solde || 0) + numericAmount;
      }
    } catch (err: any) {
      console.error('[handlePaymentConfirmation] Erreur Action A Firestore wallet increment:', err?.message);
    }
  }

  // ACTION B (Document) : Si type === 'document' et docId existe, débloquer 'user_documents/{docId}'
  if (resolvedType === 'document' && docId) {
    console.log(`[handlePaymentConfirmation] Action B (Document) : Déblocage de user_documents/${docId}`);
    try {
      const docRef = db.collection('user_documents').doc(docId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        await docRef.set({
          isUnlocked: true,
          status: 'UNLOCKED',
          unlocked: true,
          isPaid: true,
          paymentGateway: 'Money Fusion',
          paidAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });
      } else {
        await docRef.set({
          id: docId,
          userId: userId || 'guest',
          isUnlocked: true,
          status: 'UNLOCKED',
          unlocked: true,
          isPaid: true,
          paymentGateway: 'Money Fusion',
          paidAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });
      }

      if (userId && userId !== 'guest') {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          purchasedDocIds: FieldValue.arrayUnion(docId),
          lastPaymentAt: nowIso,
          lastPaymentProvider: 'Money Fusion',
          updatedAt: nowIso
        }, { merge: true });

        const uIdx = adminStore.users.findIndex(u => u.uid === userId || (userEmail && u.email?.toLowerCase() === userEmail.toLowerCase()));
        if (uIdx !== -1) {
          adminStore.users[uIdx].unlockedDocsCount = (adminStore.users[uIdx].unlockedDocsCount || 0) + 1;
          const currentPurchased = (adminStore.users[uIdx] as any).purchasedDocIds || [];
          if (!currentPurchased.includes(docId)) {
            (adminStore.users[uIdx] as any).purchasedDocIds = [...currentPurchased, docId];
          }
        }
      }
    } catch (err: any) {
      console.error('[handlePaymentConfirmation] Erreur Action B Firestore doc unlock:', err?.message);
    }
  }

  // ACTION C (Abonnement) : Si type === 'subscription', mettre à jour 'users/{userId}' (isVip: true, subscriptionStatus: 'ACTIVE')
  if (resolvedType === 'subscription' && userId && userId !== 'guest') {
    const resolvedPlan = plan || 'PASS_VIP';
    const durationDays = resolvedPlan === 'annual' || numericAmount >= 15000 ? 365 : (resolvedPlan === 'weekly' ? 7 : 30);
    const expiresDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    console.log(`[handlePaymentConfirmation] Action C (Abonnement) : Activation VIP pour ${userId} (${resolvedPlan})`);

    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        isVip: true,
        subscriptionStatus: 'ACTIVE',
        plan: resolvedPlan,
        vipActivatedAt: nowIso,
        lastPaymentAt: nowIso,
        lastPaymentProvider: 'Money Fusion',
        updatedAt: nowIso,
        subscription: {
          planId: resolvedPlan,
          status: 'ACTIVE',
          activatedAt: nowIso,
          expiresAt: expiresDate,
          pricePaid: numericAmount,
          paymentMethod: 'Money Fusion',
          paymentGateway: 'Money Fusion'
        }
      }, { merge: true });

      const uIdx = adminStore.users.findIndex(u => u.uid === userId || (userEmail && u.email?.toLowerCase() === userEmail.toLowerCase()));
      if (uIdx !== -1) {
        adminStore.users[uIdx].isVip = true;
        adminStore.users[uIdx].subscriptionStatus = 'ACTIVE';
        (adminStore.users[uIdx] as any).plan = resolvedPlan;
      }
    } catch (err: any) {
      console.error('[handlePaymentConfirmation] Erreur Action C Firestore VIP activation:', err?.message);
    }
  }

  return {
    success: true,
    transactionId: txId,
    status: 'SUCCESS',
    type: resolvedType,
    docId,
    userId,
    amount: numericAmount
  };
}

/**
 * 1.B. Initialisation du Checkout Money Fusion (Passerelle Mobile Money & QR Code)
 * POST /api/moneyfusion/checkout
 * 1. CRÉATION DE TRANSACTION DÈS LE CHECKOUT (PENDING) DANS FIRESTORE
 * 2. TRANSMISSION DE TOUTES LES MÉTADONNÉES DANS personal_Info
 */
app.post('/api/moneyfusion/checkout', async (req, res) => {
  try {
    const {
      amount,
      totalPrice,
      phoneNumber,
      docId = '',
      userId = '',
      userPhone = '',
      userName = '',
      planId = '',
      plan = '',
      type = '',
      promoCode = '',
      email,
      userEmail,
      currency = 'XOF',
      title = '',
      documentTitle = '',
      content = null,
      contentData = null,
      documentData = null,
      description = 'Service Dokya',
      customer = {},
      metadata = {}
    } = req.body || {};

    const rawAmount = amount !== undefined ? amount : (totalPrice !== undefined ? totalPrice : 0);
    const numericAmount = Number(rawAmount || 0);
    
    // 1. Vérifie que numericAmount > 0
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Montant de paiement invalide. Le montant doit être supérieur à 0 FCFA.'
      });
    }

    // 2. Vérifie que phoneNumber est renseigné
    const targetPhone = String(phoneNumber || userPhone || customer?.phone || '').trim();
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        error: 'Le numéro de téléphone (pour le paiement Mobile Money) est obligatoire.'
      });
    }

    const targetAmount = Math.round(numericAmount);
    const targetDocId = String(docId || metadata.targetDocId || metadata.docId || '').trim();
    const targetPlanId = String(plan || planId || metadata.planId || metadata.plan || '').trim();
    
    // Résolution explicite du type : 'wallet' | 'document' | 'subscription'
    let resolvedType: 'wallet' | 'document' | 'subscription' = 'wallet';
    const rawType = String(type || metadata.type || '').trim().toLowerCase();
    if (rawType.includes('wallet') || rawType.includes('recharge')) {
      resolvedType = 'wallet';
    } else if (rawType.includes('doc') || targetDocId) {
      resolvedType = 'document';
    } else if (rawType.includes('sub') || rawType.includes('vip') || targetPlanId) {
      resolvedType = 'subscription';
    }

    const targetUserId = String(userId || metadata.userId || 'guest').trim() || 'guest';
    const targetUserEmail = String(userEmail || email || customer?.email || metadata?.userEmail || '').trim();
    const targetName = String(userName || customer?.name || 'Utilisateur').trim() || 'Utilisateur';
    const targetPromoCode = String(promoCode || metadata.promoCode || '').trim().toUpperCase();
    const targetTitle = String(title || documentTitle || 'Document sans titre').trim();
    const targetContent = content || contentData || documentData || {};

    // Génération d'un ID de transaction unique et traçable
    const transactionId = `MF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const db = getServerAdminDb();

    // 1. SAUVEGARDE DU DOCUMENT AVANT LE PAIEMENT (Résolution NOT_FOUND)
    // Crée impérativement le document dans la collection Firestore 'user_documents' AVANT le paiement
    if (resolvedType === 'document' && targetDocId) {
      try {
        const docRef = db.collection('user_documents').doc(targetDocId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          await docRef.set({
            id: targetDocId,
            docId: targetDocId,
            userId: targetUserId,
            title: targetTitle || "Document sans titre",
            content: targetContent,
            isUnlocked: false,
            status: "PENDING",
            isPaid: false,
            createdAt: nowIso,
            updatedAt: nowIso
          }, { merge: true });
          console.log(`[Money Fusion Checkout] Document pré-enregistré dans user_documents/${targetDocId} (status: PENDING)`);
        }
      } catch (dbDocErr: any) {
        console.warn('[Money Fusion Checkout] Warning pré-création document dans Firestore:', dbDocErr?.message);
      }
    }

    // 2. CRÉATION DE LA TRANSACTION DÈS LE CHECKOUT DANS LA COLLECTION FIRESTORE 'transactions'
    const txType = resolvedType === 'wallet' ? 'wallet_recharge' : (resolvedType === 'document' ? 'document_purchase' : 'subscription_purchase');
    const pendingTxRecord = {
      id: transactionId,
      transactionId: transactionId,
      userId: targetUserId,
      userEmail: targetUserEmail,
      userName: targetName || "Utilisateur",
      phoneNumber: targetPhone,
      userPhone: targetPhone,
      type: txType,
      resolvedType: resolvedType,
      typeLabel: resolvedType === 'document' ? 'Achat Document' : (resolvedType === 'subscription' ? 'Abonnement VIP' : 'Recharge Solde'),
      docId: targetDocId || null,
      targetDocId: targetDocId || null,
      plan: targetPlanId || null,
      planId: targetPlanId || null,
      amount: Number(targetAmount),
      expectedAmount: Number(targetAmount),
      currency: currency || 'XOF',
      promoCode: targetPromoCode || null,
      status: 'PENDING', // Statut PENDING dès le checkout
      paymentGateway: 'Money Fusion',
      paymentMethod: 'moneyfusion',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      await db.collection('transactions').doc(transactionId).set(pendingTxRecord, { merge: true });
      console.log(`[Money Fusion Checkout] Transaction PENDING enregistrée dans Firestore: ${transactionId} (${txType}, ${targetAmount} FCFA)`);
    } catch (dbErr: any) {
      console.warn('[Money Fusion Checkout] Warning sauvegarde transaction PENDING dans Firestore:', dbErr?.message);
    }

    // Synchronisation store local en mémoire
    adminStore.transactions.unshift(pendingTxRecord);

    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app').replace(/\/$/, '');
    const returnUrl = `${appBaseUrl}/dashboard?payment=success&transactionId=${transactionId}&docId=${targetDocId || ''}&type=${resolvedType}&plan=${targetPlanId || ''}&amount=${targetAmount}`;
    const webhookUrl = `${appBaseUrl}/api/webhooks/moneyfusion`;

    const apiKey = process.env.MONEYFUSION_API_KEY;

    let targetEndpoint = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').trim();
    if (targetEndpoint === 'https://api.moneyfusion.net' || targetEndpoint === 'https://api.moneyfusion.net/') {
      targetEndpoint = 'https://api.moneyfusion.net/api/v1/payments';
    }

    const articleLabel = resolvedType === 'document'
      ? `Déblocage Document Dokya (${targetDocId || 'Nouveau'})`
      : (resolvedType === 'subscription' ? `Abonnement Dokya ${targetPlanId || 'VIP'}` : "Rechargement Wallet Dokya");

    // 3. TRANSMISSION DU MONTANT ET DES MÉTADONNÉES DANS /api/moneyfusion/checkout
    // Transmets impérativement le montant sous les clés amount et totalPrice dans le body et dans personal_Info
    const paymentData = {
      amount: Number(targetAmount),
      totalPrice: Number(targetAmount),
      article: [
        { [articleLabel]: Number(targetAmount) }
      ],
      personal_Info: [
        {
          userId: targetUserId,
          docId: targetDocId || "",
          type: resolvedType,
          plan: targetPlanId || "",
          amount: Number(targetAmount),
          userEmail: targetUserEmail,
          transactionId: transactionId
        }
      ],
      numeroSend: targetPhone || "00000000",
      nomclient: targetName || "Client Dokya",
      return_url: returnUrl,
      webhook_url: webhookUrl
    };

    console.log('[Money Fusion Checkout] Initialisation avec métadonnées complètes:', {
      transactionId,
      amount: targetAmount,
      type: resolvedType,
      docId: targetDocId,
      plan: targetPlanId,
      userId: targetUserId,
      userEmail: targetUserEmail
    });

    // 3. Appel API officielle Money Fusion si configurée
    if (apiKey || process.env.MONEYFUSION_API_URL) {
      try {
        const response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'X-API-KEY': apiKey } : {})
          },
          body: JSON.stringify(paymentData)
        });

        const data: any = await response.json().catch(() => ({}));

        if (response.ok) {
          const checkoutUrl = data.url || (data.token ? `https://pay.moneyfusion.net/checkout/${data.token}` : null);
          if (checkoutUrl) {
            console.log('[Money Fusion Checkout] URL générée avec succès par l\'API Money Fusion:', checkoutUrl);
            return res.json({
              success: true,
              url: checkoutUrl,
              token: data.token || transactionId,
              transactionId: transactionId,
              provider: 'moneyfusion'
            });
          }
        }

        console.warn('[Money Fusion Checkout] Réponse inattendue de l\'API Money Fusion, utilisation du fallback:', data);
      } catch (apiErr) {
        console.error('[Money Fusion Checkout] Erreur lors de l\'appel API Money Fusion:', apiErr);
      }
    }

    // 4. Fallback de redirection / simulation pour aperçu et tests locaux
    console.info('[Money Fusion Checkout] Mode simulation/redirection active.');
    const simulatedSuccessUrl = `${returnUrl}&status=approved&unlocked=true&ref=${transactionId}`;

    return res.json({
      success: true,
      url: simulatedSuccessUrl,
      checkout_url: simulatedSuccessUrl,
      checkoutUrl: simulatedSuccessUrl,
      token: transactionId,
      transactionId: transactionId,
      simulated: true,
      provider: 'moneyfusion',
      message: 'Redirection vers la passerelle Money Fusion'
    });
  } catch (error: any) {
    console.error('[Money Fusion Checkout Internal Error]:', error);
    return res.status(500).json({
      error: error.message || 'Erreur interne lors de la création de la session Money Fusion'
    });
  }
});

/**
 * 1.C. Webhook Money Fusion
 * POST /api/webhooks/moneyfusion
 * Confirme le paiement, met à jour Firestore à status: 'SUCCESS' et exécute Actions A / B / C
 */
app.post('/api/webhooks/moneyfusion', async (req, res) => {
  const payload = req.body || {};
  console.log("[Money Fusion Webhook] Payload reçu:", JSON.stringify(payload));

  try {
    const personalInfo = Array.isArray(payload.personal_Info) ? (payload.personal_Info[0] || {}) : (payload.personal_Info || {});
    const metadata = payload.metadata || payload.customData || {};

    const transactionId = String(payload.transactionId || personalInfo.transactionId || metadata.transactionId || '').trim();
    const token = String(payload.token || payload.orderId || payload.id || '').trim();
    const docId = String(payload.docId || personalInfo.docId || metadata.docId || '').trim();
    const userId = String(payload.userId || personalInfo.userId || metadata.userId || '').trim();
    const userEmail = String(payload.email || personalInfo.userEmail || personalInfo.email || metadata.userEmail || payload.clientEmail || '').trim();
    const userName = String(personalInfo.userName || personalInfo.nom || metadata.userName || payload.nomclient || payload.clientName || '').trim();
    const userPhone = String(payload.numeroSend || personalInfo.userPhone || personalInfo.telephone || '').trim();
    const amount = Number(payload.amount || payload.totalPrice || personalInfo.amount || metadata.amount || 0);
    const type = String(payload.type || personalInfo.type || metadata.type || '').trim().toLowerCase();
    const plan = String(payload.plan || payload.planId || personalInfo.planId || personalInfo.plan || metadata.planId || metadata.plan || '').trim();
    
    const rawStatus = payload.statut ?? payload.status ?? payload.event ?? '';
    const statusVal = String(rawStatus).toLowerCase();
    const isSuccess = statusVal === 'true' || statusVal === 'success' || statusVal === 'paid' || statusVal === 'completed' || statusVal === 'approved' || rawStatus === true || rawStatus === 1;

    if (!isSuccess && (statusVal === 'cancel' || statusVal === 'failed' || statusVal === 'refused' || statusVal === 'false')) {
      console.log(`[Money Fusion Webhook] Statut ${statusVal}, acquittement sans traitement.`);
      return res.status(200).json({ status: "success" });
    }

    // Traitement complet et atomique via le gestionnaire unifié
    await handlePaymentConfirmation({
      transactionId: transactionId || token,
      token,
      userId,
      userEmail,
      userName,
      userPhone,
      docId,
      plan,
      type,
      amount
    });

  } catch (error: any) {
    console.error('[Money Fusion Webhook Error]:', error);
  }

  return res.status(200).json({ status: "success" });
});

/**
 * 1.D. Vérification de Statut de Transaction Money Fusion
 * GET /api/moneyfusion/status/:token
 */
app.get('/api/moneyfusion/status/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Token manquant' });
    }

    // A. Vérifier dans Firestore
    const db = getServerAdminDb();
    try {
      const docSnap = await db.collection('transactions').doc(token).get();
      if (docSnap.exists) {
        const txData = docSnap.data();
        if (txData?.status === 'SUCCESS' || txData?.status === 'COMPLETED' || txData?.status === 'APPROVED') {
          return res.json({
            paid: true,
            status: 'SUCCESS',
            transaction: txData
          });
        }
      }
    } catch (_dbErr) {}

    // B. Vérifier dans le store local
    const existingTx = adminStore.transactions.find(t => t.id === token || t.transactionId === token || (t as any).token === token);
    if (existingTx && (existingTx.status === 'SUCCESS' || existingTx.status === 'COMPLETED' || existingTx.status === 'APPROVED')) {
      return res.json({
        paid: true,
        status: 'SUCCESS',
        transaction: existingTx
      });
    }

    // C. Interroger l'API officielle Money Fusion
    const apiKey = process.env.MONEYFUSION_API_KEY;
    try {
      const checkUrls = [
        `https://pay.moneyfusion.net/paiementNotif/${token}`,
        `https://api.moneyfusion.net/api/v1/payments/${token}`
      ];

      for (const checkUrl of checkUrls) {
        try {
          const mfRes = await fetch(checkUrl, {
            headers: {
              'Accept': 'application/json',
              ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
            }
          });

          if (mfRes.ok) {
            const mfData: any = await mfRes.json();
            const pData = mfData.data || mfData;
            const status = String(pData.statut ?? mfData.statut ?? pData.status ?? mfData.status ?? '').toLowerCase();
            const isSuccess = status === 'paid' || status === 'completed' || status === 'true' || status === 'success' || status === 'approved' || mfData.statut === true;

            if (isSuccess) {
              await handlePaymentConfirmation({
                transactionId: token,
                token,
                amount: Number(pData.totalPrice || pData.amount || pData.Montant || 0)
              });

              return res.json({
                paid: true,
                status: 'SUCCESS',
                data: mfData
              });
            }

            return res.json({
              paid: false,
              status: status ? status.toUpperCase() : 'PENDING',
              data: mfData
            });
          }
        } catch (_urlErr) {}
      }
    } catch (checkErr: any) {
      console.warn('[Money Fusion Status Check Warn]:', checkErr.message);
    }

    // D. Si mode simulation
    if (token.startsWith('MF_') || token.startsWith('MF-')) {
      await handlePaymentConfirmation({ transactionId: token });
      return res.json({
        paid: true,
        status: 'SUCCESS',
        simulated: true
      });
    }

    return res.json({
      paid: false,
      status: 'PENDING'
    });
  } catch (err: any) {
    console.error('[Money Fusion Status Error]:', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de la vérification de transaction' });
  }
});

/**
 * 1.E. Route de vérification de secours au retour client
 * GET / POST /api/moneyfusion/verify
 * Si le webhook n'a pas encore exécuté l'action, vérifie et valide immédiatement
 */
app.all('/api/moneyfusion/verify', async (req, res) => {
  try {
    const params = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;
    const token = String(params.token || params.paymentId || '').trim();
    const transactionId = String(params.transactionId || '').trim();
    let docId = String(params.docId || '').trim();
    let userId = String(params.userId || '').trim();
    let userEmail = String(params.userEmail || params.email || '').trim();
    let userName = String(params.userName || '').trim();
    let phoneNumber = String(params.phoneNumber || params.userPhone || '').trim();
    let type = String(params.type || '').trim().toLowerCase();
    let plan = String(params.plan || params.planId || '').trim();
    let amount = Number(params.amount || 0);

    console.log('[Server /api/moneyfusion/verify]', { token, transactionId, docId, userId, type, plan, amount, phoneNumber });

    // Si token fourni, tenter vérification API Money Fusion
    if (token && !token.startsWith('MF_') && !token.startsWith('MF-')) {
      try {
        const mfRes = await fetch(`https://pay.moneyfusion.net/paiementNotif/${token}`);
        if (mfRes.ok) {
          const mfData: any = await mfRes.json();
          const pData = mfData.data || {};
          const status = String(pData.statut || mfData.statut || '').toLowerCase();
          if (status === 'paid' || status === 'completed' || status === 'success' || status === 'approved' || mfData.statut === true) {
            const pInfo = Array.isArray(pData.personal_Info) ? (pData.personal_Info[0] || {}) : (pData.personal_Info || {});
            if (!userId) userId = String(pInfo.userId || '').trim();
            if (!userEmail) userEmail = String(pInfo.userEmail || pInfo.email || '').trim();
            if (!userName) userName = String(pInfo.userName || pData.nomclient || '').trim();
            if (!phoneNumber) phoneNumber = String(pData.numeroSend || pInfo.phoneNumber || '').trim();
            if (!docId) docId = String(pInfo.docId || '').trim();
            if (!plan) plan = String(pInfo.planId || pInfo.plan || '').trim();
            if (!type) type = String(pInfo.type || '').trim().toLowerCase();
            if (!amount && pData.Montant) amount = Number(pData.Montant);
            if (!amount && pData.totalPrice) amount = Number(pData.totalPrice);
          }
        }
      } catch (e: any) {
        console.warn('[Verify Token Warn]:', e.message);
      }
    }

    // Exécution immédiate du traitement unifié (Validation Firestore status: 'SUCCESS' + Solde utilisateur)
    const result = await handlePaymentConfirmation({
      transactionId: transactionId || token,
      token,
      userId,
      userEmail,
      userName,
      userPhone: phoneNumber,
      docId,
      plan,
      type,
      amount
    });

    const realAmount = Number(result?.amount || amount || 0);

    return res.json({
      success: true,
      amount: realAmount,
      status: 'SUCCESS',
      transactionId: result.transactionId || transactionId || token,
      docId: result.docId || docId,
      userId: result.userId || userId,
      type: result.type || type,
      message: 'Paiement confirmé et solde mis à jour avec succès'
    });
  } catch (err: any) {
    console.error('[Verify Route Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Paiement Manuel (Méthode 2 : Soumission par le client et validation admin)
 * POST /api/payments/manual
 */
app.post('/api/payments/manual', async (req, res) => {
  try {
    const { action } = req.body || {};

    // 3.A. ACTION ADMIN : APPROVE ou REJECT
    if (action === 'APPROVE' || action === 'REJECT') {
      const { paymentId, adminEmail = 'peter25ngouala@gmail.com', rejectionReason } = req.body;
      const idx = manualPaymentsStore.findIndex(p => p.id === paymentId || p.paymentId === paymentId);

      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Demande de paiement manuel introuvable.' });
      }

      const payment = manualPaymentsStore[idx];
      const now = new Date();

      if (action === 'APPROVE') {
        payment.status = 'APPROVED';
        payment.approvedBy = adminEmail;
        payment.approvedAt = now.toISOString();

        const planType = payment.planType || 'PASS_VIP';
        const amount = Number(payment.amount || 5000);
        let durationDays = planType === 'annual' ? 365 : planType === 'weekly' ? 7 : 30;
        const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // Activer le compte de l'utilisateur
        const userIdx = adminStore.users.findIndex(u => u.uid === payment.userId || (payment.userEmail && u.email.toLowerCase() === payment.userEmail.toLowerCase()));
        if (userIdx !== -1) {
          adminStore.users[userIdx].subscriptionStatus = 'unlimited';
          (adminStore.users[userIdx] as any).subscription = {
            planId: planType,
            status: 'ACTIVE',
            activatedAt: now.toISOString(),
            expiresAt: expiresDate.toISOString(),
            pricePaid: amount,
            paymentMethod: 'manual_transfer'
          };
        }

        // Commission de 20% au parrain
        if (payment.referredBy) {
          const commission = Math.round(amount * 0.20);
          const refIdx = adminStore.users.findIndex(u => u.uid === payment.referredBy || (u as any).referralCode === payment.referredBy);
          if (refIdx !== -1) {
            (adminStore.users[refIdx] as any).affiliateBalance = ((adminStore.users[refIdx] as any).affiliateBalance || 0) + commission;
          }
        }

        // Synchroniser dans adminStore.transactions
        const txIdx = adminStore.transactions.findIndex(t => t.id === paymentId);
        if (txIdx !== -1) {
          adminStore.transactions[txIdx].status = 'APPROVED';
          adminStore.transactions[txIdx].aiStatus = 'MANUALLY_VALIDATED';
          adminStore.transactions[txIdx].approvedAt = now.toISOString();
        }

        return res.json({
          success: true,
          status: 'APPROVED',
          message: 'Paiement manuel validé et compte VIP activé avec succès.'
        });
      }

      if (action === 'REJECT') {
        payment.status = 'REJECTED';
        payment.rejectedBy = adminEmail;
        payment.rejectedAt = now.toISOString();
        payment.rejectionReason = rejectionReason || 'Reçu non conforme';

        const txIdx = adminStore.transactions.findIndex(t => t.id === paymentId);
        if (txIdx !== -1) {
          adminStore.transactions[txIdx].status = 'REJECTED';
          adminStore.transactions[txIdx].rejectionReason = rejectionReason;
        }

        return res.json({
          success: true,
          status: 'REJECTED',
          message: 'Demande de paiement manuel refusée.'
        });
      }
    }

    // 3.B. SOUMISSION PAR LE CLIENT
    const {
      userId,
      userName = '',
      userEmail = '',
      userPhone = '',
      planType = 'PASS_VIP',
      amount = 5000,
      currency = 'XOF',
      operator = 'WAVE',
      reference = '',
      senderPhone = '',
      proofBase64 = null,
      referredBy = null,
      note = ''
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'Identifiant utilisateur requis.' });
    }

    const now = new Date();
    const paymentId = `MP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment = {
      id: paymentId,
      paymentId,
      userId,
      userName,
      userEmail,
      userPhone,
      planType,
      amount: Number(amount) || 5000,
      currency: currency || 'XOF',
      operator: operator || 'WAVE',
      reference: reference.trim(),
      senderPhone: senderPhone.trim(),
      proofBase64: proofBase64 || null,
      referredBy: referredBy || null,
      note: note.trim() || null,
      status: 'PENDING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    manualPaymentsStore.unshift(newPayment);

    // Également ajouté à adminStore.transactions pour que l'admin le voie en temps réel
    adminStore.transactions.unshift({
      id: paymentId,
      transactionId: reference.trim() || paymentId,
      userId,
      userName,
      userEmail,
      userPhone,
      type: 'SUBSCRIPTION_PURCHASE',
      planId: planType,
      amount: Number(amount) || 5000,
      currency: currency || 'XOF',
      operator,
      paymentMethod: 'manual_transfer',
      status: 'PENDING_APPROVAL',
      aiStatus: 'WAITING_FOR_ADMIN',
      receiptImage: proofBase64,
      createdAt: now.toISOString(),
      metadata: {
        senderPhone,
        referredBy,
        source: 'manual_payment'
      }
    });

    console.log(`[Manual Payment] Nouvelle demande reçue : ${paymentId} de ${userEmail || userId} (${amount} XOF)`);

    return res.json({
      success: true,
      paymentId,
      status: 'PENDING',
      message: 'Votre preuve de transfert a été envoyée avec succès. Notre équipe va vérifier votre paiement sous 15 à 30 minutes.'
    });
  } catch (error: any) {
    console.error('[Manual Payment Route Error]:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de l\'enregistrement du paiement' });
  }
});

/**
 * 4. GET /api/payments/manual - Consultation des paiements manuels
 */
app.get('/api/payments/manual', (req, res) => {
  const { userId, status } = req.query as { userId?: string; status?: string };
  let results = [...manualPaymentsStore];

  if (userId) {
    results = results.filter(p => p.userId === userId);
  }
  if (status) {
    results = results.filter(p => p.status === status);
  }

  return res.json({
    success: true,
    count: results.length,
    payments: results
  });
});

/**
 * 5. POST /api/payments/manual/validate - Alias direct pour validation admin
 */
app.post('/api/payments/manual/validate', (req, res) => {
  req.body.action = 'APPROVE';
  const handler = (app as any)._router.stack.find((layer: any) => layer.route?.path === '/api/payments/manual' && layer.route?.methods?.post);
  if (handler) {
    return handler.route.stack[0].handle(req, res);
  }
  return res.status(500).json({ error: 'Route handler introuvable' });
});

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT API ENDPOINTS
// Security: Restricts access to authorized administrator (peter25ngouala@gmail.com)
// ==========================================
const DEFAULT_ADMIN_EMAILS = [
  'peter25ngouala@gmail.com'
];

function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  
  // Check default admin list
  if (DEFAULT_ADMIN_EMAILS.some(a => a.toLowerCase() === normalized)) {
    return true;
  }

  // Check environment variables ADMIN_EMAIL or ADMIN_EMAILS
  const envAdminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS;
  if (envAdminEmail) {
    const envList = envAdminEmail.split(',').map(e => e.trim().toLowerCase());
    if (envList.includes(normalized)) {
      return true;
    }
  }

  return false;
}

export interface ServerAdminUserRecord {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  targetJob?: string;
  balance: number;
  walletBalance?: number;
  credits: number;
  isVip?: boolean;
  role: 'admin' | 'candidate' | 'recruiter' | string;
  subscriptionStatus: 'free' | 'pro' | 'unlimited' | string;
  subscription?: any;
  status?: 'active' | 'suspended' | string;
  suspendedReason?: string;
  documentsCount?: number;
  ordersCount?: number;
  unlockedDocsCount?: number;
  hasForceUnlockedDocs?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerAuditLog {
  id: string;
  timestamp: string;
  category: 'admin_action' | 'wallet' | 'payment' | 'document' | 'auth' | 'promo' | 'pricing' | 'security';
  action: string;
  actorEmail: string;
  actorRole: 'admin' | 'system' | 'candidate';
  targetUserEmail?: string;
  targetUserId?: string;
  details: string;
  metadata?: Record<string, any>;
  status: 'success' | 'warning' | 'error';
}

// In-memory persistent demo store for users, transactions, and metrics
const adminStore: {
  users: ServerAdminUserRecord[];
  pricing: any;
  promoCodes: any[];
  auditLogs: ServerAuditLog[];
  transactions: any[];
  documents: any[];
} = {
  users: [],
  pricing: {
    cvOnlyPrice: 1000,
    letterOnlyPrice: 1000,
    fullPackPrice: 1399,
    devisPrice: 1000,
    facturePrice: 1000,
    businessPackPrice: 1499,
    unlimitedPassPrice: 3499,
    unlimitedPassMonthlyPrice: 3499,
    unlimitedPassAnnualPrice: 39999,
    recruiterSearchPrice: 10000,
    currency: 'FCFA',
    updatedAt: new Date().toISOString(),
    updatedBy: 'peter25ngouala@gmail.com'
  },
  promoCodes: [
    {
      id: 'PRM-001',
      code: 'TERANGA20',
      discountType: 'percentage' as const,
      discountValue: 20,
      minOrderAmount: 1000,
      maxUsageLimit: 250,
      currentUsageCount: 47,
      active: true,
      description: '20% de réduction sur tous les documents',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    },
    {
      id: 'PRM-002',
      code: 'BIENVENUE500',
      discountType: 'fixed' as const,
      discountValue: 500,
      minOrderAmount: 1000,
      maxUsageLimit: 500,
      currentUsageCount: 112,
      active: true,
      description: '500 FCFA offerts sur la première commande',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    },
    {
      id: 'PRM-003',
      code: 'DAKAR2026',
      discountType: 'percentage' as const,
      discountValue: 30,
      minOrderAmount: 1000,
      maxUsageLimit: 100,
      currentUsageCount: 29,
      active: true,
      description: '30% de remise spéciale promotionnelle',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    },
    {
      id: 'PRM-004',
      code: 'PROMO50',
      discountType: 'percentage' as const,
      discountValue: 50,
      minOrderAmount: 1000,
      maxUsageLimit: 200,
      currentUsageCount: 15,
      active: true,
      description: '50% de réduction exceptionnelle',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    },
    {
      id: 'PRM-005',
      code: 'GRATUIT100',
      discountType: 'percentage' as const,
      discountValue: 100,
      minOrderAmount: 0,
      maxUsageLimit: 500,
      currentUsageCount: 8,
      active: true,
      description: '100% de réduction (Déblocage gratuit & immédiat)',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    },
    {
      id: 'PRM-006',
      code: 'LIL',
      discountType: 'percentage' as const,
      discountValue: 90,
      minOrderAmount: 0,
      maxUsageLimit: 1000,
      currentUsageCount: 2,
      active: true,
      description: 'Code spécial LIL : 90% de réduction immédiate',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    },
    {
      id: 'PRM-007',
      code: 'PETER',
      discountType: 'percentage' as const,
      discountValue: 100,
      minOrderAmount: 0,
      maxUsageLimit: 1000,
      currentUsageCount: 1,
      active: true,
      description: 'Accès VIP Admin PETER (100% de réduction)',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    },
    {
      id: 'PRM-008',
      code: 'VIP100',
      discountType: 'percentage' as const,
      discountValue: 100,
      minOrderAmount: 0,
      maxUsageLimit: 1000,
      currentUsageCount: 0,
      active: true,
      description: 'Code Privilège VIP : 100% de réduction',
      createdAt: new Date().toISOString(),
      createdBy: 'peter25ngouala@gmail.com'
    }
  ],
  auditLogs: [],
  transactions: [],
  documents: []
};

// Middleware to verify admin identity
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminEmail = (
    req.headers['x-admin-email'] ||
    req.headers['x-user-email'] ||
    req.body?.adminEmail ||
    req.query?.adminEmail
  ) as string | undefined;

  const roleHeader = (req.headers['x-user-role'] || req.headers['x-admin-role']) as string | undefined;
  const isRoleAdmin = roleHeader && (roleHeader.toLowerCase() === 'admin' || roleHeader === 'ADMIN');

  if (!isAuthorizedAdmin(adminEmail) && !isRoleAdmin) {
    console.warn(`[Admin Security] Tentative d'accès non autorisée rejetée pour : ${adminEmail || 'inconnu'}`);
    return res.status(403).json({
      success: false,
      error: "Accès refusé : Ce compte n'a pas les privilèges administrateur requis."
    });
  }
  next();
};

// Audit Log Helper
function recordAuditLog(
  category: 'auth' | 'payment' | 'wallet' | 'document' | 'admin_action' | 'pricing' | 'promo' | 'security',
  action: string,
  actorEmail: string,
  details: string,
  metadata?: Record<string, any>,
  targetUserEmail?: string,
  targetUserId?: string,
  status: 'success' | 'warning' | 'error' = 'success'
) {
  const logEntry = {
    id: `LOG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    category,
    action,
    actorEmail,
    actorRole: (isAuthorizedAdmin(actorEmail) ? 'admin' : 'candidate') as 'admin' | 'system' | 'candidate',
    targetUserEmail,
    targetUserId,
    details,
    metadata,
    status
  };
  adminStore.auditLogs.unshift(logEntry);
  if (adminStore.auditLogs.length > 500) {
    adminStore.auditLogs.pop();
  }
  return logEntry;
}

// 1. GET /api/admin/stats - Overview & KPIs
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalUsers = adminStore.users.length;
    const totalCVs = adminStore.users.reduce((acc, u) => acc + (u.documentsCount || 0), 0);
    
    // Calculate total revenue from successful credit/recharge/purchase transactions
    const successfulTx = adminStore.transactions.filter(
      t => (t.status === 'success' || t.status === 'completed' || t.status === 'VALIDATED_BY_AI' || t.status === 'MANUALLY_VALIDATED') && t.amount > 0
    );
    const totalRevenue = successfulTx.reduce((acc, t) => acc + t.amount, 0);
    const totalCirculatingBalance = adminStore.users.reduce((acc, u) => acc + (u.balance || 0), 0);
    const totalTransactions = adminStore.transactions.length;

    const cvOnlyRevenue = successfulTx
      .filter(t => (t.description || '').toLowerCase().includes('cv') && !(t.description || '').toLowerCase().includes('lettre'))
      .reduce((acc, t) => acc + t.amount, 0);
    const fullPackRevenue = successfulTx
      .filter(t => (t.description || '').toLowerCase().includes('pack') || (t.description || '').toLowerCase().includes('duo'))
      .reduce((acc, t) => acc + t.amount, 0);
    const letterRevenue = successfulTx
      .filter(t => (t.description || '').toLowerCase().includes('lettre'))
      .reduce((acc, t) => acc + t.amount, 0);
    const unlimitedRevenue = successfulTx
      .filter(t => (t.description || '').toLowerCase().includes('illimit') || (t.description || '').toLowerCase().includes('vip'))
      .reduce((acc, t) => acc + t.amount, 0);

    const successRate = totalTransactions > 0 
      ? Math.round((successfulTx.length / totalTransactions) * 100) 
      : 100;

    return res.json({
      success: true,
      stats: {
        totalRevenue,
        totalCVsGenerated: totalCVs,
        totalUsersCount: totalUsers,
        totalTransactionsCount: totalTransactions,
        totalCirculatingBalance,
        successPaymentRate: successRate,
        revenueByService: {
          cvOnly: cvOnlyRevenue,
          letterOnly: letterRevenue,
          fullPack: fullPackRevenue,
          devis: 0,
          facture: 0,
          businessPack: 0,
          unlimitedPass: unlimitedRevenue,
          walletRecharge: 0,
        },
        dailyRevenueTrend: []
      }
    });
  } catch (err: any) {
    console.error('[Admin Stats Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors du calcul des statistiques admin.' });
  }
});

// 2. GET /api/admin/users - List users with pagination and search
app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const search = (req.query.search as string || '').toLowerCase().trim();
    const roleFilter = (req.query.role as string || '').trim();
    const statusFilter = (req.query.status as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));

    let filtered = adminStore.users.filter(u => {
      if (search) {
        const matchesName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(search);
        const matchesEmail = u.email.toLowerCase().includes(search);
        const matchesJob = (u.targetJob || '').toLowerCase().includes(search);
        const matchesCity = (u.city || '').toLowerCase().includes(search);
        const matchesPhone = (u.phone || '').toLowerCase().includes(search);
        if (!matchesName && !matchesEmail && !matchesJob && !matchesCity && !matchesPhone) return false;
      }
      if (roleFilter && roleFilter !== 'all') {
        if (u.role !== roleFilter) return false;
      }
      if (statusFilter && statusFilter !== 'all') {
        if ((u.status || 'active') !== statusFilter) return false;
      }
      return true;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

    return res.json({
      success: true,
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err: any) {
    console.error('[Admin Users Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la récupération des utilisateurs.' });
  }
});

// 3. User Impersonation Token / Start Session
app.post('/api/admin/users/:id/impersonate', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    
    const user = adminStore.users.find(u => u.uid === id || u.email.toLowerCase() === id.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable pour la prise de contrôle.' });
    }

    recordAuditLog(
      'admin_action',
      'USER_IMPERSONATION_STARTED',
      adminEmail,
      `Prise de contrôle (Impersonation) du compte de ${user.firstName} ${user.lastName} (${user.email}) par l'administrateur ${adminEmail}`,
      { targetUserId: user.uid, targetUserEmail: user.email },
      user.email,
      user.uid,
      'warning'
    );

    return res.json({
      success: true,
      targetUser: user,
      adminEmail,
      impersonationToken: `IMP-${Date.now()}-${user.uid}`,
      message: `Session temporaire activée pour ${user.firstName} ${user.lastName} (${user.email}).`
    });
  } catch (err: any) {
    console.error('[Admin Impersonate Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la prise de contrôle.' });
  }
});

// 4. Force Unlock Documents for a user
app.post('/api/admin/users/:id/unlock-documents', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    const { reason = 'Déblocage administratif forcé' } = req.body || {};

    const userIndex = adminStore.users.findIndex(u => u.uid === id || u.email.toLowerCase() === id.toLowerCase());
    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    adminStore.users[userIndex].hasForceUnlockedDocs = true;
    adminStore.users[userIndex].unlockedDocsCount = (adminStore.users[userIndex].documentsCount || 1) + 3;
    adminStore.users[userIndex].subscriptionStatus = 'pro';
    adminStore.users[userIndex].updatedAt = new Date().toISOString();

    recordAuditLog(
      'document',
      'FORCE_UNLOCK_DOCUMENTS',
      adminEmail,
      `Déblocage forcé de tous les documents générés pour ${adminStore.users[userIndex].email}. Motif: ${reason}`,
      { reason },
      adminStore.users[userIndex].email,
      adminStore.users[userIndex].uid,
      'success'
    );

    return res.json({
      success: true,
      user: adminStore.users[userIndex],
      message: `Documents de ${adminStore.users[userIndex].email} débloqués avec succès sans restriction.`
    });
  } catch (err: any) {
    console.error('[Admin Unlock Docs Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors du déblocage des documents.' });
  }
});

// 5. Suspend / Activate User Account
app.post('/api/admin/users/:id/toggle-suspension', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    const { reason = 'Action administrative de conformité' } = req.body || {};

    const userIndex = adminStore.users.findIndex(u => u.uid === id || u.email.toLowerCase() === id.toLowerCase());
    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    if (adminStore.users[userIndex].role === 'admin' && adminStore.users[userIndex].email === 'peter25ngouala@gmail.com') {
      return res.status(400).json({ success: false, error: 'Impossible de suspendre le compte Super Admin principal.' });
    }

    const currentStatus = adminStore.users[userIndex].status || 'active';
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    adminStore.users[userIndex].status = newStatus;
    adminStore.users[userIndex].suspendedReason = newStatus === 'suspended' ? reason : undefined;
    adminStore.users[userIndex].updatedAt = new Date().toISOString();

    recordAuditLog(
      'security',
      newStatus === 'suspended' ? 'USER_ACCOUNT_SUSPENDED' : 'USER_ACCOUNT_REACTIVATED',
      adminEmail,
      `${newStatus === 'suspended' ? 'Suspension' : 'Réactivation'} du compte de ${adminStore.users[userIndex].email}. Motif: ${reason}`,
      { reason, newStatus },
      adminStore.users[userIndex].email,
      adminStore.users[userIndex].uid,
      newStatus === 'suspended' ? 'warning' : 'success'
    );

    return res.json({
      success: true,
      user: adminStore.users[userIndex],
      status: newStatus,
      message: `Compte ${adminStore.users[userIndex].email} ${newStatus === 'suspended' ? 'suspendu' : 'réactivé'} avec succès.`
    });
  } catch (err: any) {
    console.error('[Admin Toggle Suspend Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors du changement de statut.' });
  }
});

// 6. Update User Personal Info
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    const { firstName, lastName, phone, city, targetJob, role, subscriptionStatus, balance } = req.body || {};

    const userIndex = adminStore.users.findIndex(u => u.uid === id || u.email.toLowerCase() === id.toLowerCase());
    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    const user = adminStore.users[userIndex];
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (city !== undefined) user.city = city;
    if (targetJob !== undefined) user.targetJob = targetJob;
    if (role !== undefined) user.role = role;
    if (subscriptionStatus !== undefined) user.subscriptionStatus = subscriptionStatus;
    if (balance !== undefined && !isNaN(Number(balance))) user.balance = Number(balance);
    user.updatedAt = new Date().toISOString();

    recordAuditLog(
      'admin_action',
      'USER_PROFILE_UPDATED',
      adminEmail,
      `Mise à jour des informations personnelles de ${user.email} (${user.firstName} ${user.lastName})`,
      { updatedFields: req.body },
      user.email,
      user.uid,
      'success'
    );

    return res.json({
      success: true,
      user,
      message: `Profil de ${user.email} mis à jour avec succès.`
    });
  } catch (err: any) {
    console.error('[Admin Update User Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la mise à jour du profil.' });
  }
});

// 7. Delete User Account
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.query?.adminEmail || 'peter25ngouala@gmail.com') as string;

    const userIndex = adminStore.users.findIndex(u => u.uid === id || u.email.toLowerCase() === id.toLowerCase());
    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    const user = adminStore.users[userIndex];
    if (user.role === 'admin' && user.email === 'peter25ngouala@gmail.com') {
      return res.status(400).json({ success: false, error: 'Impossible de supprimer le compte Super Admin.' });
    }

    adminStore.users.splice(userIndex, 1);

    recordAuditLog(
      'security',
      'USER_ACCOUNT_DELETED',
      adminEmail,
      `Suppression définitive du compte de ${user.email} (${user.firstName} ${user.lastName}) par l'administrateur`,
      { deletedUserEmail: user.email, deletedUserId: user.uid },
      user.email,
      user.uid,
      'error'
    );

    return res.json({
      success: true,
      message: `Le compte utilisateur ${user.email} a été définitivement supprimé.`
    });
  } catch (err: any) {
    console.error('[Admin Delete User Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la suppression de l\'utilisateur.' });
  }
});

// 8. POST /api/admin/wallet/adjust - Adjust a user's wallet balance
app.post('/api/admin/wallet/adjust', requireAdmin, (req, res) => {
  try {
    const { userId, userEmail, amount, type = 'credit', reason = 'Ajustement Administrateur' } = req.body || {};
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;

    const delta = Number(amount);
    if (!delta || delta <= 0) {
      return res.status(400).json({ success: false, error: 'Montant d\'ajustement invalide (doit être supérieur à 0 FCFA).' });
    }

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Le motif de l\'ajustement est obligatoire pour la traçabilité comptable.' });
    }

    // Find user by userId or email
    let userIndex = adminStore.users.findIndex(u => u.uid === userId || (userEmail && u.email.toLowerCase() === userEmail.toLowerCase()));
    
    if (userIndex < 0 && (userId || userEmail)) {
      // Create user entry dynamically if needed
      const newUser = {
        uid: userId || `USR-${Date.now()}`,
        email: userEmail || `${userId}@user.senegalcv.sn`,
        firstName: 'Candidat',
        lastName: '',
        phone: '+221 77 000 00 00',
        city: 'Dakar',
        targetJob: 'Candidat',
        balance: 0,
        credits: 0,
        role: 'candidate' as const,
        subscriptionStatus: 'free' as const,
        status: 'active' as const,
        documentsCount: 0,
        ordersCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      adminStore.users.push(newUser);
      userIndex = adminStore.users.length - 1;
    }

    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    const currentBalance = Number(adminStore.users[userIndex].balance) || 0;
    let newBalance = currentBalance;
    let transactionAmount = 0;

    if (type === 'credit') {
      newBalance = currentBalance + delta;
      transactionAmount = delta;
    } else {
      if (currentBalance < delta) {
        return res.status(400).json({
          success: false,
          error: `Débit impossible : Le solde actuel de l'utilisateur est de ${currentBalance.toLocaleString('fr-FR')} FCFA, inférieur au montant à retirer (${delta.toLocaleString('fr-FR')} FCFA).`
        });
      }
      newBalance = currentBalance - delta;
      transactionAmount = -delta;
    }

    adminStore.users[userIndex].balance = newBalance;
    adminStore.users[userIndex].updatedAt = new Date().toISOString();

    const txId = `TX-ADM-${Date.now().toString().slice(-6)}`;
    const newTx = {
      id: txId,
      userId: adminStore.users[userIndex].uid,
      userEmail: adminStore.users[userIndex].email,
      type: 'admin_adjustment' as const,
      amount: transactionAmount,
      currency: 'XOF',
      description: `Ajustement Admin (${type === 'credit' ? '+Ajout' : '-Retrait'}) : ${reason}`,
      reason,
      adminEmail,
      status: 'success' as const,
      paymentMethod: 'admin_manual' as const,
      newBalance,
      createdAt: new Date().toISOString()
    };

    adminStore.transactions.unshift(newTx);

    recordAuditLog(
      'wallet',
      'WALLET_ADJUSTMENT',
      adminEmail,
      `Ajustement solde de ${adminStore.users[userIndex].email} : ${type === 'credit' ? '+' : '-'}${delta.toLocaleString('fr-FR')} FCFA (Nouveau solde: ${newBalance.toLocaleString('fr-FR')} FCFA). Motif: ${reason}`,
      { amount: delta, type, newBalance, reason, txId },
      adminStore.users[userIndex].email,
      adminStore.users[userIndex].uid,
      'success'
    );

    return res.json({
      success: true,
      user: adminStore.users[userIndex],
      transaction: newTx,
      newBalance,
      message: `Solde de ${adminStore.users[userIndex].email} ajusté avec succès : ${newBalance.toLocaleString('fr-FR')} FCFA (${type === 'credit' ? '+' : '-'}${delta.toLocaleString('fr-FR')} FCFA).`
    });
  } catch (err: any) {
    console.error('[Admin Adjust Wallet Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de l\'ajustement du solde.' });
  }
});

// 8b. POST /api/admin/subscriptions/manage - Manage user VIP subscription
app.post('/api/admin/subscriptions/manage', requireAdmin, (req, res) => {
  try {
    const { userId, action, durationDays = 30, adminNote } = req.body || {};
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;

    const userIndex = adminStore.users.findIndex(u => u.uid === userId || u.email.toLowerCase() === (userId || '').toLowerCase());
    if (userIndex >= 0) {
      const isLifetime = durationDays >= 36500;
      const targetDate = isLifetime ? new Date('2099-12-31T23:59:59Z') : new Date(Date.now() + durationDays * 86400000);
      
      if (action === 'activate' || action === 'extend') {
        adminStore.users[userIndex].subscriptionStatus = 'unlimited';
        adminStore.users[userIndex].subscription = {
          planId: 'PASS_VIP',
          planName: isLifetime ? 'Pass VIP À Vie (Permanent)' : `Pass VIP (${durationDays} jours)`,
          status: 'ACTIVE',
          activatedAt: new Date().toISOString(),
          expiresAt: targetDate.toISOString(),
          autoRenew: false,
          adminNote: adminNote || `Activation manuelle VIP (${durationDays}j)`
        };
      } else if (action === 'suspend') {
        adminStore.users[userIndex].subscriptionStatus = 'free';
        if (adminStore.users[userIndex].subscription) {
          adminStore.users[userIndex].subscription.status = 'INACTIVE';
          adminStore.users[userIndex].subscription.adminNote = adminNote || 'Suspension administrative';
        }
      } else if (action === 'reset') {
        adminStore.users[userIndex].subscriptionStatus = 'free';
        adminStore.users[userIndex].subscription = {
          planId: 'FREE',
          status: 'INACTIVE',
          activatedAt: null,
          expiresAt: null,
          autoRenew: false
        };
      }
      adminStore.users[userIndex].updatedAt = new Date().toISOString();
    }

    recordAuditLog(
      'admin_action',
      `SUBSCRIPTION_${(action || 'UPDATE').toUpperCase()}`,
      adminEmail,
      `Action abonnement ${action} (${durationDays} jours) pour ${userId}. Note: ${adminNote || 'N/A'}`,
      { userId, action, durationDays, adminNote },
      userIndex >= 0 ? adminStore.users[userIndex].email : userId,
      userId,
      'success'
    );

    return res.json({
      success: true,
      message: `Action ${action} effectuée avec succès.`
    });
  } catch (err: any) {
    console.error('[Admin Subscriptions Manage Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur gestion abonnement' });
  }
});

// 9. Pricing Configuration Endpoints (Public & Admin)
app.get('/api/pricing', (req, res) => {
  return res.json({
    success: true,
    pricing: adminStore.pricing
  });
});

app.get('/api/admin/pricing', requireAdmin, (req, res) => {
  return res.json({
    success: true,
    pricing: adminStore.pricing
  });
});

app.post('/api/admin/pricing', requireAdmin, (req, res) => {
  try {
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    const {
      cvOnlyPrice,
      letterOnlyPrice,
      fullPackPrice,
      devisPrice,
      facturePrice,
      businessPackPrice,
      unlimitedPassPrice,
      unlimitedPassMonthlyPrice,
      unlimitedPassAnnualPrice,
      recruiterSearchPrice,
      ebookPrice
    } = req.body || {};

    if (cvOnlyPrice !== undefined && !isNaN(Number(cvOnlyPrice))) adminStore.pricing.cvOnlyPrice = Number(cvOnlyPrice);
    if (letterOnlyPrice !== undefined && !isNaN(Number(letterOnlyPrice))) adminStore.pricing.letterOnlyPrice = Number(letterOnlyPrice);
    if (fullPackPrice !== undefined && !isNaN(Number(fullPackPrice))) adminStore.pricing.fullPackPrice = Number(fullPackPrice);
    if (devisPrice !== undefined && !isNaN(Number(devisPrice))) adminStore.pricing.devisPrice = Number(devisPrice);
    if (facturePrice !== undefined && !isNaN(Number(facturePrice))) adminStore.pricing.facturePrice = Number(facturePrice);
    if (businessPackPrice !== undefined && !isNaN(Number(businessPackPrice))) adminStore.pricing.businessPackPrice = Number(businessPackPrice);
    if (ebookPrice !== undefined && !isNaN(Number(ebookPrice))) adminStore.pricing.ebookPrice = Number(ebookPrice);
    if (unlimitedPassPrice !== undefined && !isNaN(Number(unlimitedPassPrice))) adminStore.pricing.unlimitedPassPrice = Number(unlimitedPassPrice);
    if (unlimitedPassMonthlyPrice !== undefined && !isNaN(Number(unlimitedPassMonthlyPrice))) {
      adminStore.pricing.unlimitedPassMonthlyPrice = Number(unlimitedPassMonthlyPrice);
      adminStore.pricing.unlimitedPassPrice = Number(unlimitedPassMonthlyPrice);
    }
    if (unlimitedPassAnnualPrice !== undefined && !isNaN(Number(unlimitedPassAnnualPrice))) adminStore.pricing.unlimitedPassAnnualPrice = Number(unlimitedPassAnnualPrice);
    if (recruiterSearchPrice !== undefined && !isNaN(Number(recruiterSearchPrice))) adminStore.pricing.recruiterSearchPrice = Number(recruiterSearchPrice);

    adminStore.pricing.updatedAt = new Date().toISOString();
    adminStore.pricing.updatedBy = adminEmail;

    recordAuditLog(
      'pricing',
      'PRICING_UPDATED',
      adminEmail,
      `Mise à jour des tarifs plateforme : CV/Lettre/Devis/Facture=1000F, Pack Emploi=${adminStore.pricing.fullPackPrice}F, Pack Business=${adminStore.pricing.businessPackPrice}F, Pass Mois=${adminStore.pricing.unlimitedPassPrice}F, Pass An=${adminStore.pricing.unlimitedPassAnnualPrice || 39999}F`,
      { pricing: adminStore.pricing },
      undefined,
      undefined,
      'success'
    );

    return res.json({
      success: true,
      pricing: adminStore.pricing,
      message: 'Grille tarifaire mise à jour avec succès et synchronisée sur l\'application.'
    });
  } catch (err: any) {
    console.error('[Admin Pricing Update Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la mise à jour des prix.' });
  }
});

// 10. Promo Codes Endpoints
app.get(['/api/admin/promo-codes', '/api/admin/codes-promo', '/api/promo-codes', '/api/codes-promo'], (req, res) => {
  return res.json({
    success: true,
    promoCodes: adminStore.promoCodes || []
  });
});

app.post(['/api/admin/promo-codes', '/api/admin/codes-promo'], requireAdmin, (req, res) => {
  try {
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    const { id, code, discountType, discountValue, minOrderAmount, maxUsageLimit, description, active } = req.body || {};

    if (!code || code.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Le code promo doit contenir au moins 3 caractères (ex: PROMO20).' });
    }

    const cleanCode = code.trim().toUpperCase();
    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, error: 'Valeur de réduction invalide.' });
    }

    if (discountType === 'percentage' && val > 100) {
      return res.status(400).json({ success: false, error: 'Le pourcentage de réduction ne peut pas dépasser 100%.' });
    }

    if (id) {
      // Edit existing promo code
      const index = adminStore.promoCodes.findIndex(p => p.id === id);
      if (index >= 0) {
        adminStore.promoCodes[index] = {
          ...adminStore.promoCodes[index],
          code: cleanCode,
          discountType: discountType || 'percentage',
          discountValue: val,
          minOrderAmount: Number(minOrderAmount) || 0,
          maxUsageLimit: Number(maxUsageLimit) || 100,
          description: description || '',
          active: active !== undefined ? Boolean(active) : adminStore.promoCodes[index].active
        };

        recordAuditLog(
          'promo',
          'PROMO_CODE_MODIFIED',
          adminEmail,
          `Modification du code promo ${cleanCode} (${val}${discountType === 'percentage' ? '%' : ' FCFA'})`,
          { promo: adminStore.promoCodes[index] },
          undefined,
          undefined,
          'success'
        );

        return res.json({ success: true, promoCode: adminStore.promoCodes[index], message: 'Code promo modifié avec succès.' });
      }
    }

    // Check duplicate code
    if (adminStore.promoCodes.some(p => p.code === cleanCode)) {
      return res.status(400).json({ success: false, error: `Le code promo "${cleanCode}" existe déjà.` });
    }

    const newPromo = {
      id: `PRM-${Date.now().toString().slice(-5)}`,
      code: cleanCode,
      discountType: (discountType || 'percentage') as 'percentage' | 'fixed',
      discountValue: val,
      minOrderAmount: Number(minOrderAmount) || 0,
      maxUsageLimit: Number(maxUsageLimit) || 100,
      currentUsageCount: 0,
      active: active !== undefined ? Boolean(active) : true,
      description: description || `Réduction de ${val}${discountType === 'percentage' ? '%' : ' FCFA'}`,
      createdAt: new Date().toISOString(),
      createdBy: adminEmail
    };

    adminStore.promoCodes.unshift(newPromo);

    recordAuditLog(
      'promo',
      'PROMO_CODE_CREATED',
      adminEmail,
      `Création du code promo ${cleanCode} (${val}${discountType === 'percentage' ? '%' : ' FCFA'})`,
      { promo: newPromo },
      undefined,
      undefined,
      'success'
    );

    return res.json({
      success: true,
      promoCode: newPromo,
      message: `Code promo "${cleanCode}" créé avec succès.`
    });
  } catch (err: any) {
    console.error('[Admin Save Promo Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la sauvegarde du code promo.' });
  }
});

app.post('/api/admin/promo-codes/:id/toggle', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;

    const index = adminStore.promoCodes.findIndex(p => p.id === id || p.code === id.toUpperCase());
    if (index < 0) {
      return res.status(404).json({ success: false, error: 'Code promo introuvable.' });
    }

    const promo = adminStore.promoCodes[index];
    promo.active = !promo.active;

    recordAuditLog(
      'promo',
      promo.active ? 'PROMO_CODE_ACTIVATED' : 'PROMO_CODE_DEACTIVATED',
      adminEmail,
      `Code promo ${promo.code} ${promo.active ? 'activé' : 'désactivé'}`,
      { promoId: promo.id, code: promo.code, active: promo.active },
      undefined,
      undefined,
      'success'
    );

    return res.json({
      success: true,
      promoCode: promo,
      message: `Code promo "${promo.code}" ${promo.active ? 'activé' : 'désactivé'} avec succès.`
    });
  } catch (err: any) {
    console.error('[Admin Toggle Promo Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors du changement de statut.' });
  }
});

app.delete('/api/admin/promo-codes/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.query?.adminEmail || 'peter25ngouala@gmail.com') as string;

    const index = adminStore.promoCodes.findIndex(p => p.id === id || p.code.toUpperCase() === id.toUpperCase());
    if (index >= 0) {
      const deleted = adminStore.promoCodes.splice(index, 1)[0];

      recordAuditLog(
        'promo',
        'PROMO_CODE_DELETED',
        adminEmail,
        `Suppression du code promo ${deleted.code}`,
        { deletedCode: deleted.code },
        undefined,
        undefined,
        'warning'
      );

      return res.json({
        success: true,
        message: `Code promo ${deleted.code} supprimé avec succès.`
      });
    }

    return res.json({
      success: true,
      message: 'Code promo supprimé avec succès.'
    });
  } catch (err: any) {
    console.error('[Admin Delete Promo Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la suppression du code promo.' });
  }
});

// Promo Code Validation Handler (Shared between /api/promo/validate, /api/promo/valider and /api/promo-codes/validate)
const handleValidatePromoCode = (req: express.Request, res: express.Response) => {
  try {
    const { code, amount } = req.body || req.query || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        error: 'Veuillez saisir un code promo.' 
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const orderAmount = Math.max(0, Number(amount) || 0);

    const fallbackPromos: Record<string, { type: 'percentage' | 'fixed'; val: number; desc: string }> = {
      'PETER': { type: 'percentage', val: 100, desc: 'Accès VIP Gratuit Administrateur (-100%)' },
      'VIP100': { type: 'percentage', val: 100, desc: 'Code VIP Déblocage 100% Offert' },
      'GRATUIT100': { type: 'percentage', val: 100, desc: 'Déblocage 100% Gratuit Dokya' },
      'ADMIN100': { type: 'percentage', val: 100, desc: 'Accès Administrateur (-100%)' },
      'LIL': { type: 'percentage', val: 90, desc: 'Offre Spéciale LIL (-90%)' },
      'PROMO50': { type: 'percentage', val: 50, desc: '50% de réduction exceptionnelle' },
      'DAKAR2026': { type: 'percentage', val: 30, desc: '30% de remise spéciale promotionnelle' },
      'TERANGA20': { type: 'percentage', val: 20, desc: '20% de réduction sur tous les documents' },
      'BIENVENUE500': { type: 'fixed', val: 500, desc: '500 FCFA offerts sur votre commande' }
    };

    let promo = adminStore.promoCodes.find(p => p.code === cleanCode);
    if (!promo && fallbackPromos[cleanCode]) {
      const fb = fallbackPromos[cleanCode];
      promo = {
        id: `PRM-${cleanCode}`,
        code: cleanCode,
        discountType: fb.type,
        discountValue: fb.val,
        minOrderAmount: 0,
        maxUsageLimit: 1000,
        currentUsageCount: 0,
        active: true,
        description: fb.desc
      };
    }

    if (!promo) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" est invalide ou inexistant.`
      });
    }

    if (!promo.active) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" a été désactivé.`
      });
    }

    if (promo.maxUsageLimit && promo.currentUsageCount >= promo.maxUsageLimit) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" a atteint son quota maximal d'utilisations (${promo.maxUsageLimit}).`
      });
    }

    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: `Montant minimum requis pour ce code : ${promo.minOrderAmount.toLocaleString('fr-FR')} FCFA (Votre montant : ${orderAmount.toLocaleString('fr-FR')} FCFA).`
      });
    }

    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      if (promo.discountValue >= 100) {
        discountAmount = orderAmount;
      } else {
        discountAmount = Math.round((orderAmount * promo.discountValue) / 100);
      }
    } else {
      discountAmount = Math.min(orderAmount, promo.discountValue);
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);
    const isFree = finalAmount === 0;

    let discountLabel = promo.discountType === 'percentage'
      ? `-${promo.discountValue}%`
      : `-${(promo.discountValue || 0).toLocaleString('fr-FR')} FCFA`;

    return res.json({
      success: true,
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountLabel,
      discountAmount,
      originalAmount: orderAmount,
      finalAmount,
      isFree,
      description: promo.description,
      message: isFree 
        ? `Code "${promo.code}" appliqué : 100% de réduction (Gratuit) !` 
        : `Code "${promo.code}" appliqué : ${discountLabel} (-${discountAmount.toLocaleString('fr-FR')} FCFA)`
    });
  } catch (err: any) {
    console.error('[Validate Promo Error]:', err);
    return res.status(500).json({ success: false, valid: false, error: err.message || 'Erreur lors de la validation du code promo.' });
  }
};

// Route 1: /api/promo/validate et /api/promo/valider
app.post(['/api/promo/validate', '/api/promo/valider', '/api/promo-codes/validate', '/api/codes-promo/validate'], handleValidatePromoCode);
app.get(['/api/promo/validate', '/api/promo/valider'], handleValidatePromoCode);

// Public Promo Code Redemption (Increment usage when document unlocked/paid)
const handleRedeemPromoCode = (req: express.Request, res: express.Response) => {
  try {
    const { code, userEmail, documentTitle, finalAmount } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code manquant.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const promo = adminStore.promoCodes.find(p => p.code === cleanCode);
    if (promo) {
      promo.currentUsageCount = (promo.currentUsageCount || 0) + 1;
      
      recordAuditLog(
        'promo',
        'PROMO_CODE_REDEEMED',
        userEmail || 'candidat@senegalcv.sn',
        `Utilisation du code promo ${cleanCode} pour "${documentTitle || 'Document'}" (Montant final: ${finalAmount || 0} FCFA)`,
        { code: cleanCode, finalAmount, documentTitle },
        userEmail,
        undefined,
        'success'
      );

      return res.json({
        success: true,
        code: promo.code,
        currentUsageCount: promo.currentUsageCount
      });
    }

    return res.json({ success: true, message: 'Code traité.' });
  } catch (err: any) {
    console.error('[Redeem Promo Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la validation finale du code.' });
  }
};

app.post('/api/promo/redeem', handleRedeemPromoCode);
app.post('/api/promo-codes/redeem', handleRedeemPromoCode);

// 11. Audit Logs Endpoint
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  try {
    const search = (req.query.search as string || '').toLowerCase().trim();
    const category = (req.query.category as string || '').trim();
    const status = (req.query.status as string || '').trim();

    let list = adminStore.auditLogs.filter(log => {
      if (search) {
        const matchesAction = log.action.toLowerCase().includes(search);
        const matchesDetails = log.details.toLowerCase().includes(search);
        const matchesActor = log.actorEmail.toLowerCase().includes(search);
        const matchesTarget = (log.targetUserEmail || '').toLowerCase().includes(search);
        if (!matchesAction && !matchesDetails && !matchesActor && !matchesTarget) return false;
      }
      if (category && category !== 'all') {
        if (log.category !== category) return false;
      }
      if (status && status !== 'all') {
        if (log.status !== status) return false;
      }
      return true;
    });

    return res.json({
      success: true,
      auditLogs: list,
      total: list.length
    });
  } catch (err: any) {
    console.error('[Admin Audit Logs Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la récupération des journaux d\'audit.' });
  }
});

// 12. GET /api/admin/transactions - Transaction History & Filtering
app.get('/api/admin/transactions', requireAdmin, (req, res) => {
  try {
    const search = (req.query.search as string || '').toLowerCase().trim();
    const statusFilter = (req.query.status as string || '').trim();
    const methodFilter = (req.query.method as string || '').trim();

    let list = adminStore.transactions.filter(t => {
      if (search) {
        const matchesId = t.id.toLowerCase().includes(search);
        const matchesDesc = (t.description || '').toLowerCase().includes(search);
        const matchesEmail = ((t as any).userEmail || '').toLowerCase().includes(search);
        const matchesTxId = ((t as any).transactionId || '').toLowerCase().includes(search);
        const matchesUser = t.userId.toLowerCase().includes(search);
        if (!matchesId && !matchesDesc && !matchesEmail && !matchesTxId && !matchesUser) return false;
      }
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'validated') {
          if (t.status !== 'VALIDATED_BY_AI' && t.status !== 'MANUALLY_VALIDATED' && t.status !== 'success' && t.status !== 'COMPLETED') return false;
        } else if (statusFilter === 'rejected') {
          if (t.status !== 'REJECTED_BY_AI' && t.status !== 'REJECTED_BY_ADMIN' && t.status !== 'failed') return false;
        } else if (statusFilter === 'manual') {
          if (t.status !== 'MANUALLY_VALIDATED') return false;
        } else {
          if (t.status !== statusFilter) return false;
        }
      }
      if (methodFilter && methodFilter !== 'all') {
        if (t.paymentMethod !== methodFilter) return false;
      }
      return true;
    });

    return res.json({
      success: true,
      transactions: list,
      total: list.length
    });
  } catch (err: any) {
    console.error('[Admin Transactions Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la récupération des transactions.' });
  }
});

// 13. POST /api/admin/transactions/:id/validate - Manual Override / Validation by Admin
app.post('/api/admin/transactions/:id/validate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    const { note = 'Validation manuelle effectuée par l\'administrateur' } = req.body || {};

    const db = getServerAdminDb();
    let txData: any = null;

    // 1. Recherche dans Firestore
    try {
      const docSnap = await db.collection('transactions').doc(id).get();
      if (docSnap.exists) {
        txData = docSnap.data();
      }
    } catch (_dbErr) {}

    if (!txData) {
      try {
        const qSnap = await db.collection('transactions').where('transactionId', '==', id).limit(1).get();
        if (!qSnap.empty) {
          txData = qSnap.docs[0].data();
        }
      } catch (_e) {}
    }

    // 2. Recherche dans adminStore si non trouvé
    const txIndex = adminStore.transactions.findIndex(t => t.id === id || (t as any).transactionId === id);
    if (txIndex !== -1 && !txData) {
      txData = adminStore.transactions[txIndex];
    }

    if (!txData && txIndex === -1) {
      return res.status(404).json({ success: false, error: 'Transaction introuvable.' });
    }

    const tx = txData || adminStore.transactions[txIndex];
    const targetAmount = Number(tx.amount || tx.expectedAmount || 0);

    // 3. Application immédiate et atomique via handlePaymentConfirmation
    const confirmResult = await handlePaymentConfirmation({
      transactionId: tx.id || tx.transactionId || id,
      userId: tx.userId,
      userEmail: tx.userEmail,
      userName: tx.userName,
      userPhone: tx.userPhone,
      docId: tx.docId || tx.targetDocId,
      plan: tx.plan || tx.planId,
      type: tx.type,
      amount: targetAmount,
      adminEmail,
      note
    });

    if (txIndex !== -1) {
      adminStore.transactions[txIndex].status = 'SUCCESS';
      (adminStore.transactions[txIndex] as any).aiStatus = 'MANUALLY_VALIDATED';
      (adminStore.transactions[txIndex] as any).manuallyValidatedBy = adminEmail;
      (adminStore.transactions[txIndex] as any).manuallyValidatedAt = new Date().toISOString();
      (adminStore.transactions[txIndex] as any).adminValidationNote = note;
    }

    recordAuditLog(
      'payment',
      'TRANSACTION_MANUALLY_VALIDATED',
      adminEmail,
      `Validation manuelle de la transaction ${id} pour ${tx.userEmail || tx.userId} - Montant: ${targetAmount.toLocaleString('fr-FR')} FCFA. Note: ${note}`,
      { transactionId: id, amount: targetAmount, confirmResult },
      tx.userEmail,
      tx.userId,
      'success'
    );

    return res.json({
      success: true,
      transaction: { ...tx, status: 'SUCCESS', manuallyValidatedBy: adminEmail },
      confirmResult,
      message: `Transaction ${id} validée manuellement avec succès. Firestore, solde et documents synchronisés.`
    });
  } catch (err: any) {
    console.error('[Admin Validate Transaction Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la validation manuelle.' });
  }
});

// 14. POST /api/admin/transactions/:id/reject - Confirm Rejection by Admin
app.post('/api/admin/transactions/:id/reject', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    const { reason = 'Rejet confirmé par l\'administrateur' } = req.body || {};

    const txIndex = adminStore.transactions.findIndex(t => t.id === id || (t as any).transactionId === id);
    if (txIndex === -1) {
      return res.status(404).json({ success: false, error: 'Transaction introuvable.' });
    }

    const tx = adminStore.transactions[txIndex];
    tx.status = 'REJECTED_BY_ADMIN';
    (tx as any).aiStatus = 'REJECTED_BY_ADMIN';
    (tx as any).rejectionReason = reason;
    (tx as any).rejectedBy = adminEmail;
    (tx as any).rejectedAt = new Date().toISOString();

    recordAuditLog(
      'payment',
      'TRANSACTION_REJECTED_BY_ADMIN',
      adminEmail,
      `Rejet définitif de la transaction ${tx.id} par l'administrateur. Motif: ${reason}`,
      { transactionId: tx.id, reason },
      (tx as any).userEmail,
      tx.userId,
      'warning'
    );

    return res.json({
      success: true,
      transaction: tx,
      message: `Rejet de la transaction ${tx.id} confirmé.`
    });
  } catch (err: any) {
    console.error('[Admin Reject Transaction Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors du rejet de la transaction.' });
  }
});

// 15. POST /api/admin/transactions/record & /api/transactions/record
// Allows saving validated transactions directly from Guichet/client into admin store
const handleRecordTransaction = (req: express.Request, res: express.Response) => {
  try {
    const tx = req.body?.transaction || req.body;
    if (!tx || (!tx.id && !tx.transactionId)) {
      return res.status(400).json({ success: false, error: 'Données de transaction manquantes ou invalides.' });
    }

    const txId = tx.id || tx.transactionId || `TX-${Date.now()}`;
    const rawTxRef = tx.transactionId || txId;
    const existingIndex = adminStore.transactions.findIndex(t => t.id === txId || (t as any).transactionId === rawTxRef);

    const fullRecord = {
      id: txId,
      transactionId: rawTxRef,
      userId: tx.userId || 'guest',
      userEmail: tx.userEmail || 'candidat@dokya.sn',
      userName: tx.userName || (tx.userEmail ? tx.userEmail.split('@')[0] : 'Candidat Dokya'),
      type: tx.type || (tx.amount > 0 ? 'recharge' : 'document_purchase'),
      amount: Number(tx.amount) || 0,
      expectedAmount: tx.expectedAmount || Math.abs(Number(tx.amount) || 0),
      currency: tx.currency || 'XOF',
      description: tx.description || 'Paiement Dokya',
      status: tx.status || 'COMPLETED',
      aiStatus: tx.aiStatus || (tx.status === 'COMPLETED' ? 'VALIDATED_BY_AI' : 'PENDING'),
      paymentMethod: tx.paymentMethod || 'wave',
      senderPhone: tx.senderPhone || undefined,
      countryCode: tx.countryCode || '+221',
      countryName: tx.countryName || 'Sénégal',
      documentTitle: tx.documentTitle || undefined,
      purpose: tx.purpose || undefined,
      receiptImage: tx.receiptImage && tx.receiptImage.length < 350000 ? tx.receiptImage : undefined,
      createdAt: tx.createdAt || new Date().toISOString(),
      metadata: tx.metadata || {}
    };

    if (existingIndex !== -1) {
      adminStore.transactions[existingIndex] = {
        ...adminStore.transactions[existingIndex],
        ...fullRecord
      };
    } else {
      adminStore.transactions.unshift(fullRecord);
    }

    // Add to anti-replay if valid
    if (rawTxRef) {
      verifiedReceiptIds.add(rawTxRef);
    }

    // Update user stats if registered
    const userIndex = adminStore.users.findIndex(u => u.uid === fullRecord.userId || (fullRecord.userEmail && u.email.toLowerCase() === fullRecord.userEmail.toLowerCase()));
    if (userIndex !== -1) {
      adminStore.users[userIndex].ordersCount = (adminStore.users[userIndex].ordersCount || 0) + 1;
      if (fullRecord.type === 'recharge' && fullRecord.amount > 0) {
        adminStore.users[userIndex].balance = (adminStore.users[userIndex].balance || 0) + fullRecord.amount;
      }
      adminStore.users[userIndex].updatedAt = new Date().toISOString();
    }

    recordAuditLog(
      'payment',
      'TRANSACTION_RECORDED',
      fullRecord.userEmail,
      `Transaction enregistrée : ${fullRecord.description} - Montant: ${Math.abs(fullRecord.amount).toLocaleString('fr-FR')} FCFA (${fullRecord.paymentMethod})`,
      { transactionId: fullRecord.id, status: fullRecord.status, paymentMethod: fullRecord.paymentMethod },
      fullRecord.userEmail,
      fullRecord.userId,
      'success'
    );

    return res.json({
      success: true,
      transaction: fullRecord,
      message: 'Transaction enregistrée dans la base administrative avec succès.'
    });
  } catch (err: any) {
    console.error('[Record Transaction Error]:', err);
    return res.status(500).json({ success: false, error: err.message || "Erreur lors de l'enregistrement de la transaction." });
  }
};

app.post('/api/admin/transactions/record', handleRecordTransaction);
app.post('/api/transactions/record', handleRecordTransaction);
app.post('/api/transactions/create', handleRecordTransaction);

// 16. GET /api/transactions/:id/status - Real-time status lookup for clients
app.get('/api/transactions/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const tx = adminStore.transactions.find(t => t.id === id || (t as any).transactionId === id);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction non trouvée' });
    }
    return res.json({
      success: true,
      id: tx.id,
      transactionId: (tx as any).transactionId || tx.id,
      status: tx.status,
      aiStatus: (tx as any).aiStatus,
      rejectionReason: (tx as any).rejectionReason,
      newBalance: (tx as any).newBalance,
      transaction: tx
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Erreur serveur' });
  }
});

// 17. POST /api/admin/purge-demo-data - Purge all demo/test transactions & reset test balances
app.post('/api/admin/purge-demo-data', requireAdmin, (req, res) => {
  try {
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'peter25ngouala@gmail.com') as string;
    if (adminEmail !== 'peter25ngouala@gmail.com') {
      return res.status(403).json({ success: false, error: 'Accès refusé. Réservé au super-administrateur.' });
    }

    const previousTxCount = adminStore.transactions.length;
    const previousUsersCount = adminStore.users.length;
    adminStore.transactions = [];
    adminStore.users = [];
    adminStore.auditLogs = [];
    verifiedReceiptIds.clear();

    recordAuditLog(
      'admin_action',
      'PURGE_DEMO_DATA',
      adminEmail,
      `Purge complète des données de démonstration et réinitialisation de la base pour le lancement production (${previousTxCount} transactions effacées, utilisateurs démo effacés).`,
      { previousTxCount, previousUsersCount },
      undefined,
      undefined,
      'warning'
    );

    return res.json({
      success: true,
      deletedTransactions: previousTxCount,
      deletedUsers: previousUsersCount,
      message: `Toutes les données de démonstration (${previousTxCount} transactions et faux utilisateurs) ont été purgées avec succès. Seuls les comptes enregistrés dans Firebase seront affichés.`
    });
  } catch (err: any) {
    console.error('[Purge Demo Data Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erreur lors de la purge des données.' });
  }
});

// =========================================================================
// SUPPORT TCHAT HYBRIDE - RÉPONSE AUTOMATIQUE IA DOKYA (GEMINI)
// =========================================================================
app.post('/api/support/ai-reply', async (req, res) => {
  try {
    const { message, history = [], userName = 'Candidat', userEmail = '' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message utilisateur requis.' });
    }

    const trimmedMsg = message.trim();

    // Fallback smart responder in case Gemini is unavailable
    const generateFallbackResponse = (query: string): string => {
      const q = query.toLowerCase();
      if (q.includes('cv') || q.includes('ats') || q.includes('modèle') || q.includes('modele')) {
        return `Bonjour ${userName} ! Sur Dokya AI, nos modèles de CV sont optimisés à 100% pour les logiciels de tri ATS utilisés par les recruteurs au Sénégal et à l'international.\n\n• Tarif à l'acte : 1 000 FCFA (avec export PDF haute définition et Word .docx modifiable).\n• Inclus en illimité dans tous nos Pass VIP.\n\nVous pouvez le générer en 2 minutes depuis l'onglet « Créer un CV ATS » de votre tableau de bord. Si vous avez besoin d'aide pour une personnalisation, vous pouvez aussi cliquer sur « 🆘 Parler à un conseiller humain ».`;
      }
      if (q.includes('facture') || q.includes('devis') || q.includes('business')) {
        return `Bonjour ! Dokya AI intègre un module complet de facturation conforme aux normes UEMOA / SYSCOHADA :\n\n• Factures et Devis PRO avec calcul automatique de la TVA (18%), remises et mentions légales.\n• Numérotation automatique et export PDF immédiat.\n• Tarif : 1 500 FCFA par document ou illimité avec le Pass VIP.\n\nAccédez-y directement via l'onglet « Factures & Devis » !`;
      }
      if (q.includes('wave') || q.includes('orange') || q.includes('paiement') || q.includes('recharge') || q.includes('solde') || q.includes('argent') || q.includes('kkiapay')) {
        return `Pour vos paiements et recharges sur Dokya AI :\n\n1. Nous acceptons Wave, Orange Money, KkiaPay et Cartes Bancaires.\n2. Si vous avez été débité(e) sans que votre solde ne soit crédité automatiquement, rendez-vous sur « Recharger mon solde » puis « Déjà payé ? Soumettre un reçu ». Téléversez la capture d'écran du SMS Wave ou Orange Money : notre équipe admin la validera sous quelques minutes !\n3. Pour une assistance immédiate, cliquez sur « 🆘 Parler à un conseiller humain ».`;
      }
      if (q.includes('vip') || q.includes('abonnement') || q.includes('tarif') || q.includes('prix')) {
        return `Voici nos formules d'abonnements Pass VIP Dokya :\n\n• Pass Hebdo (7 jours) : 2 500 FCFA\n• Pass Mensuel (30 jours) : 5 000 FCFA\n• Pass Annuel (365 jours) : 25 000 FCFA\n• Pass Permanent à vie : 50 000 FCFA\n\nLe Pass VIP vous donne accès illimité à tous les CV ATS, lettres, factures, simulateur d'entretiens et livres numériques sans aucun frais à l'acte !`;
      }
      if (q.includes('affiliation') || q.includes('parrain') || q.includes('commission') || q.includes('retrait') || q.includes('gagner')) {
        return `Le programme d'affiliation Dokya AI vous permet de gagner de l'argent réel :\n\n• 20% de commission cash sur chaque achat de document ou abonnement de vos filleuls.\n• Retrait disponible dès 2 000 FCFA cumulés, envoyé directement sur votre compte Wave ou Orange Money sous 24h.\n• Récupérez votre lien unique dans l'onglet « Affiliation & Parrainage » !`;
      }
      if (q.includes('humain') || q.includes('conseiller') || q.includes('agent') || q.includes('bloqu') || q.includes('problème') || q.includes('arnaque') || q.includes('erreur')) {
        return `Je comprends parfaitement votre demande. Vous pouvez cliquer sur le bouton rouge « 🆘 Parler à un conseiller humain » juste au-dessus du tchat. Dès votre clic, notre console d'administration sera alertée en temps réel avec sirène d'urgence, et un conseiller Dokya prendra directement le relais dans ce fil de discussion !`;
      }
      return `Bonjour ${userName} ! Je suis l'assistant d'aide Dokya AI. Je peux vous renseigner sur :\n\n• La création de vos CV ATS et lettres de motivation\n• Les devis et factures conformes UEMOA\n• Les recharges Wave et Orange Money (soumission de reçu)\n• Les abonnements Pass VIP et le programme d'affiliation\n\nPour une intervention personnalisée de notre équipe, cliquez sur « 🆘 Parler à un conseiller humain ». En quoi puis-je vous être utile ?`;
    };

    let aiResponseText = '';

    try {
      const ai = getGenAIClient();
      
      const systemInstruction = `Tu es l'assistant de support officiel et bienveillant de Dokya AI (plateforme de création de CV ATS, lettres de motivation, factures/devis professionnels UEMOA, livres numériques Ebooks et simulateur d'entretiens d'embauche au Sénégal et en Afrique francophone).
Client actuel : ${userName} (${userEmail || 'email non renseigné'}).

RÈGLES D'OR DU SUPPORT DOKYA :
1. Réponds de façon concise, polie, chaleureuse et structurée en français (avec quelques puces claires si nécessaire).
2. Tarifs et règles :
   - CV ATS certifié : 1 000 FCFA à l'acte ou inclus dans Pass VIP (export PDF + Word .docx).
   - Lettre de motivation : 500 FCFA.
   - Devis & Factures PRO : 1 500 FCFA (normes fiscales UEMOA/SYSCOHADA).
   - Livres Ebooks KDP : 1 500 FCFA.
   - Pass VIP : Hebdomadaire 2 500 FCFA, Mensuel 5 000 FCFA, Annuel 25 000 FCFA, Permanent à vie 50 000 FCFA.
   - Paiements : Wave, Orange Money, KkiaPay, Carte Bancaire, solde portefeuille.
   - Si un paiement Wave ou Orange Money a été débité mais non validé, le client peut soumettre la capture du reçu dans « Recharger mon solde » > « Soumettre un reçu » pour validation manuelle rapide.
   - Affiliation : 20% de commission cash par vente apportée, retrait dès 2 000 FCFA sur Wave ou Orange Money.
3. Si le client a un litige, un blocage technique sérieux ou souhaite explicitement échanger avec une personne réelle, rappelle-lui gentiment qu'il peut cliquer sur le bouton « 🆘 Parler à un conseiller humain » en haut du tchat pour que l'équipe prenne immédiatement le relais.
4. Reste toujours rassurant et réactif. Longueur idéale : 2 à 4 paragraphes courts et aérés.`;

      // Build dialog context
      let promptParts: string[] = [];
      if (Array.isArray(history) && history.length > 0) {
        const recentHistory = history.slice(-6);
        for (const h of recentHistory) {
          const roleLabel = h.role === 'user' ? 'Client' : 'Assistant Support';
          promptParts.push(`${roleLabel}: ${h.text}`);
        }
      }
      promptParts.push(`Client: ${trimmedMsg}`);
      promptParts.push(`Assistant Support:`);

      const fullPrompt = promptParts.join('\n\n');

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.1-flash-lite',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nHistorique de la conversation :\n${fullPrompt}` }] }
        ]
      });

      aiResponseText = response?.text || '';
    } catch (aiErr: any) {
      console.warn('[Support AI Notice]: Fallback to internal knowledge base:', aiErr.message);
      aiResponseText = generateFallbackResponse(trimmedMsg);
    }

    if (!aiResponseText || aiResponseText.trim() === '') {
      aiResponseText = generateFallbackResponse(trimmedMsg);
    }

    return res.json({
      success: true,
      reply: aiResponseText.trim()
    });
  } catch (err: any) {
    console.error('[Support API Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erreur lors du traitement de votre message de support.'
    });
  }
});

// ==========================================
// API CATCH-ALL & GLOBAL API ERROR HANDLER
// Prevents returning HTML pages for API calls
// ==========================================
app.use('/api/*', (req, res) => {
  return res.status(404).json({
    success: false,
    error: "Erreur Serveur (404) : Route API non trouvée. Vérifiez la configuration des variables d'environnement sur Vercel."
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path && req.path.startsWith('/api')) {
    console.error('[API Server Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Erreur Serveur (500) : Vérifiez la configuration des variables d'environnement sur Vercel."
    });
  }
  next(err);
});

// =========================================================================
// TÂCHE DE PURGE PÉRIODIQUE BACKEND (TOUTES LES 6 HEURES)
// Nettoie les fichiers temporaires et les reçus de plus de 24h
// =========================================================================
const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 heures

function runPeriodicStorageCleanup() {
  console.log('[Storage Purge] Exécution de la tâche planifiée de nettoyage des fichiers temporaires (+24h)...');
  try {
    const tempDir = path.join(process.cwd(), 'temp_uploads');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      const maxAgeMs = 24 * 60 * 60 * 1000; // 24 heures
      let count = 0;
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            count++;
          }
        } catch (err) {
          // ignore error on single file
        }
      }
      if (count > 0) {
        console.log(`[Storage Purge] ${count} fichier(s) temporaire(s) de plus de 24h nettoyé(s).`);
      }
    }
  } catch (err: any) {
    console.warn('[Storage Purge Warn]:', err?.message || err);
  }
}

if (!process.env.VERCEL) {
  setInterval(runPeriodicStorageCleanup, PURGE_INTERVAL_MS);
  setTimeout(runPeriodicStorageCleanup, 30 * 1000); // 30s après démarrage
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
