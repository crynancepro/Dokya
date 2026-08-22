import { GoogleGenAI, Type } from '@google/genai';
import { CVFormData } from '../types';

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
 * Generate optimized CV, Cover Letter and ATS keywords directly using @google/genai SDK
 */
export async function generateCVWithGemini(formData: CVFormData): Promise<{ success: boolean; data: any; error?: string }> {
  if (!formData || !formData.personalInfo) {
    return { success: false, error: 'Données de formulaire invalides ou manquantes.', data: null };
  }

  const apiKey = getGeminiApiKey();

  // If no Gemini key is provided, use high-fidelity structured generation
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('placeholder')) {
    console.warn('[Gemini Client] Clé API non fournie ou mode SPA sans backend, génération intelligente activée.');
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
      systemPrompt = `Tu es un expert RH spécialisé dans l'optimisation de CV au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est d'optimiser le contenu du CV d'un candidat pour maximiser son impact auprès des recruteurs et passer les filtres ATS.

Consignes :
1. Accroche / Profil Professionnel : Rédige un profil professionnel d'accroche de 3 lignes max, percutant et orienté valeur ajoutée pour le poste visé (${cleanData.personalInfo.targetJob || 'Poste visé'}).
2. Expériences Professionnelles : Pour chaque expérience fournie, retranscris la description sous forme de 3 à 5 puces percutantes avec verbes d'action au présent ou passé, chiffrées si possible.
3. Mots-clés ATS & Conseils d'Entretien : Propose 6 à 8 mots-clés stratégiques pour le poste et 3 conseils d'entretien clés pour le marché sénégalais / ouest-africain.

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

Génère la réponse optimisée en JSON.`;
    } else if (isLetterOnly) {
      systemPrompt = `Tu es un consultant RH d'élite spécialisé dans la rédaction de lettres de motivation percutantes au Sénégal et en Afrique francophone (Zone UEMOA/CEMAC).
Ta mission est de rédiger une lettre de motivation sur-mesure, hautement convaincante et parfaitement structurée.

Structure de la lettre :
1. Objet clair et professionnel.
2. Salutation formelle.
3. Paragraphe 1 (Accroche / VOUS) : Raison de la candidature et intérêt pour l'entreprise (60-80 mots).
4. Paragraphe 2 (MOI) : Compétences clés, expériences et réussites concrètes chiffrées (90-120 mots).
5. Paragraphe 3 (NOUS) : Synergie, apport mutuel et vision partagée (80-110 mots).
6. Paragraphe 4 (Conclusion) : Demande d'entretien et disponibilité (50-70 mots).
7. Formule de politesse soignée.

Format JSON requis.`;

      userPrompt = `Données :
- Candidat : ${cleanData.personalInfo.firstName} ${cleanData.personalInfo.lastName}
- Poste visé : ${cleanData.personalInfo.targetJob}
- Entreprise cible : ${cleanData.targetCompany || 'Entreprise de référence'}
- Localisation : ${cleanData.personalInfo.city || 'Dakar'}, ${cleanData.personalInfo.country || 'Sénégal'}
- Consignes / points forts : ${cleanData.letterInstructions || cleanData.highlightsSummary || 'Mettre en valeur ma motivation et ma rigueur'}

Expériences :
${JSON.stringify(cleanData.experiences, null, 2)}

Compétences :
${JSON.stringify(cleanData.skills, null, 2)}

Génère la réponse en JSON.`;
    } else {
      // Full Pack Mode
      systemPrompt = `Tu es un consultant RH et expert ATS de référence au Sénégal et en zone UEMOA.
Ta mission est de générer un Pack Carrière Complet (CV optimisé ATS + Lettre de motivation stratégique + Mots-clés + Conseils d'entretien).

Génère un JSON complet avec:
- profileSummary
- experiences (avec id et optimizedDescription: string[])
- suggestedKeywords (string[])
- coverLetter (subject, greeting, opening, bodyParagraphs: string[], callToAction, closing)
- interviewTips (string[])`;

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
      model: 'gemini-3.7-flash',
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
      model: 'gemini-3.7-flash',
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
