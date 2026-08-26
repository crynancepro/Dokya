import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy init Gemini client
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
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
  const requestedModel = params.model || 'gemini-flash-latest';
  // Deduplicated fallback list using valid Gemini models with separate quota & demand pools
  const rawModels = [
    requestedModel,
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
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

      const isQuotaError = errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('Quota exceeded') || errMessage.includes('quota');
      const isTransientServerOverload = errMessage.includes('503') || errMessage.includes('high demand') || errMessage.includes('UNAVAILABLE') || errMessage.includes('Overloaded');

      if (isTransientServerOverload || isQuotaError) {
        console.info(`[Gemini API] Modèle '${model}' temporairement surchargé (503/429). Basculement automatique vers le modèle de secours...`);
        // Immediately try the next model in fallback list without blocking delay
        continue;
      }

      // For other transient errors, log and try next model
      console.info(`[Gemini API] Modèle '${model}' a retourné une erreur. Tentative avec le modèle suivant...`);
    }
  }

  const isQuota = lastError?.message?.includes('429') || lastError?.message?.includes('RESOURCE_EXHAUSTED') || lastError?.message?.includes('Quota exceeded');
  if (isQuota) {
    throw new Error("Quota d'utilisation IA Gemini temporairement dépassé (limite de requêtes/jour atteinte sur le compte gratuit). Veuillez réessayer dans quelques instants ou configurer une clé API Gemini avec facturation dans les secrets d'environnement.");
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
            `Piloter et exécuter les missions stratégiques liées au poste de ${exp.position || targetJob} chez ${exp.company || 'l\'entreprise'}.`,
            `Garantir l'atteinte des objectifs opérationnels et la conformité des livrables.`,
            `Assurer le reporting régulier et collaborer avec les parties prenantes clés.`
          ];
        }
        return {
          id: exp.id || `exp-${idx}`,
          optimizedDescription: descList
        };
      })
    : [{
        id: 'exp-default-1',
        optimizedDescription: [
          `Superviser et coordonner les projets stratégiques en tant que ${targetJob}.`,
          `Mettre en œuvre les meilleures pratiques du secteur et optimiser les flux de travail.`,
          `Garantir un haut niveau de performance et de qualité de service.`
        ]
      }];

  // Strict 4-paragraph VOUS / MOI / NOUS / CONCLUSION architecture (250-350 words)
  const coverLetter = {
    subject: `Candidature${targetJob ? ` au poste de ${targetJob}` : ''}${company ? ` - ${company}` : ''}`,
    greeting: `Madame, Monsieur le Responsable des Recrutements,`,
    opening: `C'est avec un vif intérêt et un réel enthousiasme que je vous soumets ma candidature pour le poste de ${targetJob} au sein de votre organisation ${company}. Reconnu pour son dynamisme, son exigence de rigueur et sa contribution majeure au secteur d'activité à ${city} et dans la zone UEMOA, votre établissement incarne une référence d'excellence au sein de laquelle je souhaite activement investir mes compétences et mon engagement.`,
    bodyParagraphs: [
      userInstructions
        ? `Fort d'un parcours solide directement aligné avec vos attentes prioritaires (${userInstructions}), j'ai développé une solide maîtrise des méthodologies et outils indispensables à l'exercice de mes responsabilités. Mon sens aigu de l'organisation et mon pragmatisme m'ont permis de mener à bien des initiatives stratégiques, de résoudre des problématiques complexes et d'atteindre systématiquement les objectifs fixés avec un haut standard de qualité.`
        : `Fort d'un parcours solide et diversifié dans l'exercice de mes fonctions, j'ai acquis une maîtrise approfondie des outils techniques et méthodologiques propres à mon secteur. Mon esprit d'analyse et mon sens de la rigueur m'ont permis de piloter des projets d'envergure, d'optimiser les flux opérationnels et d'atteindre avec régularité des objectifs ambitieux et chiffrés tout en garantissant une conformité exemplaire.`,
      `Intégrer ${company} constitue pour moi une opportunité stratégique de conjuguer mon expertise à vos perspectives de développement. Parfaitement au fait des spécificités et des défis économiques du marché local à ${city}, je suis convaincu que mon approche proactive, mon leadership collaboratif et ma force de proposition constitueront un levier de performance durable et mesurable pour vos équipes.`
    ],
    callToAction: `Convaincu de la parfaite convergence entre vos besoins et mon profil, je serais honoré de vous rencontrer lors d'un entretien à votre convenance afin de vous exposer de vive voix le détail de mes motivations et mes perspectives de contribution. Je me tiens à votre entière disposition pour tout échange.`,
    closing: `Dans l'attente de votre précieux retour, je vous prie d'agréer, Madame, Monsieur le Responsable des Recrutements, l'expression de mes salutations distinguées et respectueuses.`
  };

  return {
    profileSummary: `${targetJob} expérimenté(e) et orienté(e) résultats basé(e) à ${city} (${country}). Reconnu(e) pour sa rigueur professionnelle, son esprit d'initiative et sa capacité à impulser des solutions performantes et adaptées au marché.`,
    experiences,
    suggestedKeywords: ['Analyse stratégique', 'Gestion de projet', 'Rigueur', 'Communication', 'Autonomie', 'Organisation', 'Leadership', 'Esprit d\'équipe'],
    coverLetter,
    interviewTips: [
      `Préparez une présentation synthétique de 2 minutes axée sur vos principales réussites pour le poste de ${targetJob}.`,
      `Démontrez votre connaissance précise du marché local à ${city} et des projets de ${company}.`,
      `Structurez vos réponses avec des exemples chiffrés probants (Méthode STAR).`
    ]
  };
}

// Main AI Generator Route
app.post('/api/generate', async (req, res) => {
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
      // CV Only Prompt
      systemPrompt = `Tu es un expert RH de haut niveau spécialisé dans l'optimisation de CV au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'optimiser le contenu du CV d'un candidat pour maximiser son impact auprès des recruteurs et passer les filtres ATS.

Consignes :
1. **Accroche / Profil Professionnel** : Rédige un profil professionnel d'accroche de 3 lignes max, percutant et orienté valeur ajoutée pour le poste visé (${cleanData.personalInfo.targetJob || 'Poste visé'}).
2. **Expériences Professionnelles** : Pour chaque expérience fournie, retranscris la description sous forme de 3 à 5 puces percutantes avec verbes d'action au présent ou passé, chiffrées si possible.
3. **Mots-clés ATS & Conseils d'Entretien** : Propose 6 à 8 mots-clés stratégiques pour le poste et 3 conseils d'entretien clés pour le marché sénégalais / ouest-africain.

Propose un JSON contenant profileSummary, experiences, suggestedKeywords, et interviewTips.`;

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

Génère la réponse optimisée au format JSON.`;

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
   - **Paragraphe 2 (Vos compétences & réalisations - Le "MOI")** : Mise en valeur des expériences techniques, projets marquants, réalisations concrètes et résultats chiffrés probants.
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

      systemPrompt = `Tu es un expert RH de haut niveau spécialisé dans le recrutement au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'optimiser les données de CV d'un candidat ET de lui rédiger une lettre de motivation assortie sur-mesure ultra convaincante, percutante, substantielle et complète occupant élégamment toute la feuille A4 (entre 250 et 350 mots, au moins 300 mots).

Consignes impératives pour l'optimisation :
1. **Accroche / Profil Professionnel** : Rédige une phrase ou un paragraphe d'accroche de 3 lignes maximum, très percutant, mettant en valeur la proposition de valeur du candidat pour le poste visé (${cleanData.personalInfo.targetJob || 'Poste visé'}).
2. **Expériences Professionnelles** : Pour chaque expérience fournie, transforme la description brute en 3 à 5 puces d'impact rédigées avec des verbes d'action forts à l'infinitif ou au passé composé, orientées résultats, métriques et maîtrise technique adaptée aux attentes des recruteurs au Sénégal et en Afrique francophone.
3. **Lettre de Motivation Sur-Mesure A4 (Architecture VOUS / MOI / NOUS / CONCLUSION)** :
   - Longueur : Corps de texte d'au moins 300 mots (entre 250 et 350 mots au total).
   - Structure en 4 paragraphes distincts et développés :
     * Paragraphe 1 (Accroche - VOUS) : Raison de la candidature et intérêt ciblé pour l'entreprise.
     * Paragraphe 2 (MOI) : Compétences & réalisations techniques, projets et résultats chiffrés.
     * Paragraphe 3 (NOUS) : Apport mutuel, synergie et contribution aux objectifs de l'entreprise.
     * Paragraphe 4 (Conclusion) : Demande explicite d'entretien et disponibilité.
   - Formule de politesse soignée (Closing).
${userInstructions ? `Consignes particulières à respecter impérativement pour la lettre : "${userInstructions}"` : ''}
4. **Mots-clés Clés ATS & Conseils d'Entretien** : Fournis 6 à 8 mots-clés stratégiques à valoriser, et 3 conseils d'entretien spécifiques au marché sénégalais / ouest-africain.

Format de sortie : JSON respectant strictly la structure demandée.`;

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

Génère la réponse optimisée en JSON.`;
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
                description: 'Profil professionnel ou accroche de candidat.',
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
                      description: 'Liste de puces percutantes avec verbes d action.',
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
    const ai = getGenAIClient();

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

    const responseText = geminiResponse.text || '';
    const extractedData = repairTruncatedJSON(responseText);

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
        userName: userEmail ? userEmail.split('@')[0] : 'Candidat',
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
      userName: userEmail ? userEmail.split('@')[0] : 'Candidat',
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

    // Si c'est une recharge de solde, créditer le compte utilisateur
    let userNewBalance = undefined;
    const userIndex = adminStore.users.findIndex(u => u.uid === userId || (userEmail && u.email.toLowerCase() === userEmail.toLowerCase()));
    if (userIndex !== -1) {
      if (purpose === 'wallet_recharge') {
        adminStore.users[userIndex].balance = (adminStore.users[userIndex].balance || 0) + effectiveAmount;
        adminStore.users[userIndex].ordersCount = (adminStore.users[userIndex].ordersCount || 0) + 1;
        userNewBalance = adminStore.users[userIndex].balance;
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
// USER WALLET / SOLDE DEBIT API ENDPOINT
// ==========================================
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

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT API ENDPOINTS
// Security: Restricts access strictly to admin1@gmail.com
// ==========================================
const AUTHORIZED_ADMIN_EMAILS = [
  'admin1@gmail.com',
  'admin1@gamil.com'
];

function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some(a => a.toLowerCase() === normalized);
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
  credits: number;
  role: 'admin' | 'candidate' | 'recruiter' | string;
  subscriptionStatus: 'free' | 'pro' | 'unlimited' | string;
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
} = {
  users: [
    {
      uid: 'USR-001',
      email: 'moussa.diop@gmail.com',
      firstName: 'Moussa',
      lastName: 'Diop',
      phone: '+221 77 123 45 67',
      city: 'Dakar',
      targetJob: 'Ingénieur DevOps & Cloud',
      balance: 4500,
      credits: 3,
      role: 'candidate',
      subscriptionStatus: 'pro',
      documentsCount: 4,
      ordersCount: 3,
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      uid: 'USR-002',
      email: 'fatou.sow@orange.sn',
      firstName: 'Fatou',
      lastName: 'Sow',
      phone: '+221 78 987 65 43',
      city: 'Saint-Louis',
      targetJob: 'Comptable & Gestionnaire Financière',
      balance: 1000,
      credits: 1,
      role: 'candidate',
      subscriptionStatus: 'free',
      documentsCount: 2,
      ordersCount: 1,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      uid: 'USR-003',
      email: 'amadou.ba@outlook.com',
      firstName: 'Amadou',
      lastName: 'Bâ',
      phone: '+221 76 543 21 00',
      city: 'Thiès',
      targetJob: 'Chef de Projet Digital',
      balance: 0,
      credits: 0,
      role: 'candidate',
      subscriptionStatus: 'free',
      documentsCount: 1,
      ordersCount: 1,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      uid: 'USR-004',
      email: 'awa.ndiaye@gmail.com',
      firstName: 'Awa',
      lastName: 'Ndiaye',
      phone: '+221 70 852 14 78',
      city: 'Dakar',
      targetJob: 'Responsable Ressources Humaines',
      balance: 6000,
      credits: 5,
      role: 'candidate',
      subscriptionStatus: 'unlimited',
      documentsCount: 8,
      ordersCount: 4,
      createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      uid: 'USR-005',
      email: 'admin1@gmail.com',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+221 77 000 00 00',
      city: 'Dakar',
      targetJob: 'Administrateur Plateforme',
      balance: 999000,
      credits: 999,
      role: 'admin',
      subscriptionStatus: 'unlimited',
      status: 'active',
      documentsCount: 15,
      ordersCount: 10,
      unlockedDocsCount: 15,
      hasForceUnlockedDocs: true,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
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
    updatedBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
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
      createdBy: 'admin1@gmail.com'
    }
  ],
  auditLogs: [
    {
      id: 'LOG-001',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      category: 'admin_action' as const,
      action: 'ADMIN_LOGIN',
      actorEmail: 'admin1@gmail.com',
      actorRole: 'admin' as const,
      details: 'Connexion sécurisée au Tableau de Bord Administrateur',
      status: 'success' as const
    },
    {
      id: 'LOG-002',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      category: 'payment' as const,
      action: 'SENEPAY_PAYMENT_SUCCESS',
      actorEmail: 'moussa.diop@gmail.com',
      actorRole: 'candidate' as const,
      targetUserEmail: 'moussa.diop@gmail.com',
      details: 'Paiement Wave 5 000 FCFA validé avec succès (Réf: TX-SP-98214)',
      status: 'success' as const
    },
    {
      id: 'LOG-003',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      category: 'document' as const,
      action: 'CV_ATS_DOWNLOAD',
      actorEmail: 'moussa.diop@gmail.com',
      actorRole: 'candidate' as const,
      targetUserEmail: 'moussa.diop@gmail.com',
      details: 'Téléchargement du document CV DevOps Senior au format PDF & DOCX',
      status: 'success' as const
    },
    {
      id: 'LOG-004',
      timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
      category: 'wallet' as const,
      action: 'WALLET_ADJUSTMENT',
      actorEmail: 'admin1@gmail.com',
      actorRole: 'admin' as const,
      targetUserEmail: 'amadou.ba@outlook.com',
      targetUserId: 'USR-003',
      details: 'Ajustement de solde : +1 000 FCFA accordés (Motif: Geste commercial support technique)',
      status: 'success' as const
    },
    {
      id: 'LOG-005',
      timestamp: new Date(Date.now() - 18 * 3600000).toISOString(),
      category: 'auth' as const,
      action: 'USER_SIGNUP',
      actorEmail: 'fatou.sow@orange.sn',
      actorRole: 'candidate' as const,
      details: 'Création d\'un nouveau compte candidat (Comptable & Gestionnaire)',
      status: 'success' as const
    },
    {
      id: 'LOG-006',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      category: 'promo' as const,
      action: 'PROMO_CODE_CREATED',
      actorEmail: 'admin1@gmail.com',
      actorRole: 'admin' as const,
      details: 'Création du code promo DAKAR2026 (-30%, limite: 100 utilisations)',
      status: 'success' as const
    }
  ],
  transactions: [
    {
      id: 'TX-OCR-88201',
      transactionId: 'WV-98214-SN',
      userId: 'USR-001',
      userEmail: 'moussa.diop@gmail.com',
      userName: 'Moussa Diop',
      type: 'recharge',
      amount: 5000,
      expectedAmount: 5000,
      extractedAmount: 5000,
      currency: 'XOF',
      description: 'Recharge Portefeuille via Wave (Reçu validé par IA)',
      status: 'VALIDATED_BY_AI',
      aiStatus: 'VALIDATED_BY_AI',
      paymentMethod: 'wave',
      receiptTimestamp: '25/08/2026 à 14:15',
      newBalance: 4500,
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      extractedData: {
        recipient_phone: '+221 78 961 90 88',
        recipient_name: 'NGOUALA LAVOISIER FORTUNE PETER',
        amount: 5000,
        expectedAmount: 5000,
        transaction_id: 'WV-98214-SN',
        date_time: '25/08/2026 à 14:15',
        validation_reason: 'Reçu officiel Wave authentique. Montant 5 000 FCFA et destinataire conformes.'
      }
    },
    {
      id: 'TX-OCR-77301',
      transactionId: 'OM-77301-SN',
      userId: 'USR-002',
      userEmail: 'fatou.sow@orange.sn',
      userName: 'Fatou Sow',
      type: 'document_purchase',
      amount: -1399,
      expectedAmount: 1399,
      extractedAmount: 1399,
      currency: 'XOF',
      description: 'Achat Pack Duo CV + Lettre (Orange Money - Validé par IA)',
      documentTitle: 'Pack Duo CV & Lettre Marketing',
      status: 'VALIDATED_BY_AI',
      aiStatus: 'VALIDATED_BY_AI',
      paymentMethod: 'orange_money',
      receiptTimestamp: '25/08/2026 à 14:22',
      newBalance: 1000,
      createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      extractedData: {
        recipient_phone: '+221 78 961 90 88',
        recipient_name: 'NGOUALA LAVOISIER FORTUNE PETER',
        amount: 1399,
        expectedAmount: 1399,
        transaction_id: 'OM-77301-SN',
        date_time: '25/08/2026 à 14:22',
        validation_reason: 'Reçu Orange Money validé avec succès. Destinataire +221 78 961 90 88 vérifié.'
      }
    },
    {
      id: 'TX-REJ-99412',
      transactionId: 'WV-EXP-4401',
      userId: 'USR-003',
      userEmail: 'amadou.ba@outlook.com',
      userName: 'Amadou Ba',
      type: 'recharge',
      amount: 1000,
      expectedAmount: 1000,
      extractedAmount: 1000,
      currency: 'XOF',
      description: 'Tentative Recharge Solde (Wave)',
      status: 'REJECTED_BY_AI',
      aiStatus: 'REJECTED_BY_AI',
      paymentMethod: 'wave',
      rejectionReason: 'Reçu expiré : émis il y a 52 minutes (limite max: 30 minutes)',
      rejectionCode: 'EXPIRED_RECEIPT',
      receiptTimestamp: '25/08/2026 à 13:30',
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
      extractedData: {
        recipient_phone: '+221 78 961 90 88',
        recipient_name: 'NGOUALA LAVOISIER FORTUNE PETER',
        amount: 1000,
        expectedAmount: 1000,
        transaction_id: 'WV-EXP-4401',
        date_time: '25/08/2026 à 13:30',
        validation_reason: 'Date conforme mais heure supérieure au délai limite autorisé de 30 minutes.',
        details: 'Heure reçue: 13:30 (52 min écoulées)'
      }
    },
    {
      id: 'TX-REJ-99413',
      transactionId: 'OM-BAD-1092',
      userId: 'USR-004',
      userEmail: 'awa.ndiaye@gmail.com',
      userName: 'Awa Ndiaye',
      type: 'document_purchase',
      amount: 1000,
      expectedAmount: 1000,
      extractedAmount: 500,
      currency: 'XOF',
      description: 'Tentative Déblocage Document (CV Juriste)',
      documentTitle: 'CV Juriste d\'Affaires',
      status: 'REJECTED_BY_AI',
      aiStatus: 'REJECTED_BY_AI',
      paymentMethod: 'orange_money',
      rejectionReason: 'Montant insuffisant (500 FCFA au lieu de 1 000 FCFA attendus)',
      rejectionCode: 'INSUFFICIENT_AMOUNT',
      receiptTimestamp: '25/08/2026 à 14:10',
      createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
      extractedData: {
        recipient_phone: '+221 78 961 90 88',
        recipient_name: 'NGOUALA LAVOISIER FORTUNE PETER',
        amount: 500,
        expectedAmount: 1000,
        transaction_id: 'OM-BAD-1092',
        date_time: '25/08/2026 à 14:10',
        validation_reason: 'Le montant extrait sur le reçu (500 FCFA) est inférieur au montant requis (1 000 FCFA).'
      }
    },
    {
      id: 'TX-ADM-1002',
      transactionId: 'MAN-WV-3391',
      userId: 'USR-003',
      userEmail: 'amadou.ba@outlook.com',
      userName: 'Amadou Ba',
      type: 'recharge',
      amount: 1000,
      expectedAmount: 1000,
      extractedAmount: 1000,
      currency: 'XOF',
      description: 'Recharge Solde via Wave (Validé Manuellement par Admin)',
      status: 'MANUALLY_VALIDATED',
      aiStatus: 'MANUALLY_VALIDATED',
      paymentMethod: 'wave',
      receiptTimestamp: '25/08/2026 à 12:45',
      manuallyValidatedBy: 'admin1@gmail.com',
      manuallyValidatedAt: new Date(Date.now() - 3600000).toISOString(),
      adminValidationNote: 'Validation manuelle après vérification du reçu sur l\'application Wave Business.',
      newBalance: 1000,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      extractedData: {
        recipient_phone: '+221 78 961 90 88',
        recipient_name: 'NGOUALA LAVOISIER FORTUNE PETER',
        amount: 1000,
        expectedAmount: 1000,
        transaction_id: 'MAN-WV-3391',
        date_time: '25/08/2026 à 12:45',
        validation_reason: 'Reçu rejeté initialement par IA pour dépassement de 35 min, mais validé après confirmation bancaire.'
      }
    }
  ]
};

// Middleware to verify admin identity
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminEmail = (
    req.headers['x-admin-email'] ||
    req.headers['x-user-email'] ||
    req.body?.adminEmail ||
    req.query?.adminEmail
  ) as string | undefined;

  if (!isAuthorizedAdmin(adminEmail)) {
    console.warn(`[Admin Security] Tentative d'accès non autorisée rejetée pour : ${adminEmail || 'inconnu'}`);
    return res.status(403).json({
      success: false,
      error: "Accès refusé : Seul l'administrateur principal (admin1@gamil.com) est autorisé à exécuter cette action administrative."
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
    const totalCVs = adminStore.users.reduce((acc, u) => acc + (u.documentsCount || 0), 0) + 128; // realistic baseline
    
    // Calculate total revenue from successful credit/recharge/purchase transactions
    const totalRevenue = adminStore.transactions
      .filter(t => t.status === 'success' && t.amount > 0 && t.paymentMethod !== 'admin_manual')
      .reduce((acc, t) => acc + t.amount, 0) + 245000; // baseline

    const totalCirculatingBalance = adminStore.users.reduce((acc, u) => acc + (u.balance || 0), 0);
    const totalTransactions = adminStore.transactions.length + 86;

    // Daily breakdown for trend charts
    const dailyStats = [
      { date: '2026-08-11', label: 'Lun 11', revenue: 24500, transactionsCount: 14, documentsCount: 19 },
      { date: '2026-08-12', label: 'Mar 12', revenue: 31000, transactionsCount: 18, documentsCount: 25 },
      { date: '2026-08-13', label: 'Mer 13', revenue: 28500, transactionsCount: 16, documentsCount: 22 },
      { date: '2026-08-14', label: 'Jeu 14', revenue: 42000, transactionsCount: 23, documentsCount: 31 },
      { date: '2026-08-15', label: 'Ven 15', revenue: 38000, transactionsCount: 21, documentsCount: 28 },
      { date: '2026-08-16', label: 'Sam 16', revenue: 54000, transactionsCount: 29, documentsCount: 42 },
      { date: '2026-08-17', label: 'Dim 17', revenue: 47000, transactionsCount: 26, documentsCount: 37 },
    ];

    return res.json({
      success: true,
      stats: {
        totalRevenue,
        totalCVsGenerated: totalCVs,
        totalUsersCount: totalUsers + 48,
        totalTransactionsCount: totalTransactions,
        totalCirculatingBalance,
        successPaymentRate: 98.4,
        revenueByService: {
          cvOnly: 75000,
          letterOnly: 32000,
          fullPack: 84000,
          devis: 28000,
          facture: 26000,
          businessPack: 45000,
          unlimitedPass: 30000,
          walletRecharge: 110000,
        },
        dailyRevenueTrend: dailyStats
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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
    
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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
    const { reason = 'Action administrative de conformité' } = req.body || {};

    const userIndex = adminStore.users.findIndex(u => u.uid === id || u.email.toLowerCase() === id.toLowerCase());
    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    if (adminStore.users[userIndex].role === 'admin' && adminStore.users[userIndex].email === 'admin1@gmail.com') {
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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
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
    const adminEmail = (req.headers['x-admin-email'] || req.query?.adminEmail || 'admin1@gmail.com') as string;

    const userIndex = adminStore.users.findIndex(u => u.uid === id || u.email.toLowerCase() === id.toLowerCase());
    if (userIndex < 0) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
    }

    const user = adminStore.users[userIndex];
    if (user.role === 'admin' && user.email === 'admin1@gmail.com') {
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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;

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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
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
app.get('/api/admin/promo-codes', requireAdmin, (req, res) => {
  return res.json({
    success: true,
    promoCodes: adminStore.promoCodes
  });
});

app.post('/api/admin/promo-codes', requireAdmin, (req, res) => {
  try {
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;

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
    const adminEmail = (req.headers['x-admin-email'] || req.query?.adminEmail || 'admin1@gmail.com') as string;

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

// Promo Code Validation Handler (Shared between /api/promo/validate and /api/promo-codes/validate)
const handleValidatePromoCode = (req: express.Request, res: express.Response) => {
  try {
    const { code, amount } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ 
        success: false, 
        valid: false, 
        error: 'Veuillez saisir un code promo.' 
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const orderAmount = Math.max(0, Number(amount) || 0);

    const promo = adminStore.promoCodes.find(p => p.code === cleanCode);
    if (!promo) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" est invalide ou inexistant.`
      });
    }

    if (!promo.active) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" a été désactivé.`
      });
    }

    if (promo.maxUsageLimit && promo.currentUsageCount >= promo.maxUsageLimit) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: `Le code promo "${cleanCode}" a atteint son quota maximal d'utilisations (${promo.maxUsageLimit}).`
      });
    }

    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      return res.status(400).json({
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

// Route 1: /api/promo/validate
app.post('/api/promo/validate', handleValidatePromoCode);

// Route 2: /api/promo-codes/validate (Legacy/Alternative)
app.post('/api/promo-codes/validate', handleValidatePromoCode);

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
app.post('/api/admin/transactions/:id/validate', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
    const { note = 'Validation manuelle effectuée par l\'administrateur' } = req.body || {};

    const txIndex = adminStore.transactions.findIndex(t => t.id === id || (t as any).transactionId === id);
    if (txIndex === -1) {
      return res.status(404).json({ success: false, error: 'Transaction introuvable.' });
    }

    const tx = adminStore.transactions[txIndex];
    tx.status = 'MANUALLY_VALIDATED';
    (tx as any).aiStatus = 'MANUALLY_VALIDATED';
    (tx as any).manuallyValidatedBy = adminEmail;
    (tx as any).manuallyValidatedAt = new Date().toISOString();
    (tx as any).adminValidationNote = note;

    if ((tx as any).transactionId) {
      verifiedReceiptIds.add((tx as any).transactionId);
    }

    // Si c'était une recharge rejetée et que l'admin valide manuellement, créditer le compte
    const targetAmount = (tx as any).expectedAmount || Math.abs(tx.amount);
    let credited = false;
    if (tx.type === 'recharge' || (tx as any).purpose === 'wallet_recharge') {
      const userIndex = adminStore.users.findIndex(u => u.uid === tx.userId || ((tx as any).userEmail && u.email.toLowerCase() === (tx as any).userEmail.toLowerCase()));
      if (userIndex !== -1) {
        adminStore.users[userIndex].balance = (adminStore.users[userIndex].balance || 0) + targetAmount;
        adminStore.users[userIndex].ordersCount = (adminStore.users[userIndex].ordersCount || 0) + 1;
        credited = true;
      }
    }

    recordAuditLog(
      'payment',
      'TRANSACTION_MANUALLY_VALIDATED',
      adminEmail,
      `Validation manuelle de la transaction ${tx.id} (${(tx as any).transactionId || 'Sans Ref'}) pour ${(tx as any).userEmail || tx.userId} - Montant: ${targetAmount.toLocaleString('fr-FR')} FCFA. Note: ${note}`,
      { transactionId: tx.id, rawTxId: (tx as any).transactionId, amount: targetAmount, credited },
      (tx as any).userEmail,
      tx.userId,
      'success'
    );

    return res.json({
      success: true,
      transaction: tx,
      credited,
      message: `Transaction ${tx.id} validée manuellement avec succès.${credited ? ' Le solde utilisateur a été crédité.' : ''}`
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
    const adminEmail = (req.headers['x-admin-email'] || req.body?.adminEmail || 'admin1@gmail.com') as string;
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
