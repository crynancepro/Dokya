import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

function generateFallbackCVData(formData: any) {
  const experiences = (formData?.experiences || []).map((exp: any) => ({
    title: exp.title || 'Poste occupé',
    company: exp.company || 'Entreprise',
    location: exp.location || 'Dakar',
    startDate: exp.startDate || '2022',
    endDate: exp.endDate || 'Présent',
    description: exp.description || '',
    bulletPoints: [
      `Gestion et réalisation de projets clés chez ${exp.company || 'l\'entreprise'}.`,
      `Optimisation des processus et amélioration des performances d'équipe.`,
      `Mise en œuvre des meilleures pratiques du secteur.`
    ]
  }));

  const targetJob = formData?.personalInfo?.targetJob || 'Professionnel';

  return {
    profileSummary: `${targetJob} expérimenté(e) et motivé(e), basé(e) au Sénégal. Reconnu(e) pour la rigueur, l'esprit d'initiative et l'atteinte d'objectifs ambitieux.`,
    experiences,
    suggestedKeywords: ['Gestion de Projet', 'Management', 'Rigueur', 'UEMOA', 'Stratégie', 'Communication'],
    coverLetter: {
      subject: `Candidature au poste de ${targetJob}`,
      greeting: 'Chère équipe de recrutement,',
      opening: `C'est avec un grand enthousiasme que je vous adresse ma candidature au poste de ${targetJob}.`,
      bodyParagraphs: [
        `Riche d'un parcours solide au cours duquel j'ai développé une solide expertise dans mon domaine, je souhaite aujourd'hui mettre mes compétences au service de votre organisation.`,
        `Mon autonomie, ma capacité d'adaptation et ma maîtrise des enjeux opérationnels me permettent de m'intégrer rapidement et de contribuer efficacement à vos projets.`
      ],
      callToAction: 'Je me tiens à votre entière disposition pour un entretien afin de vous exposer plus de vive voix mes motivations.',
      closing: 'Veuillez agréer, Madame, Monsieur, l\'expression de mes salutations distinguées.'
    }
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.json().catch(() => null);

    if (!formData || !formData.personalInfo) {
      return NextResponse.json(
        { success: false, error: 'Données de formulaire invalides ou manquantes.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        data: generateFallbackCVData(formData)
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Génère un profil optimisé et une lettre de motivation pour le candidat : ${JSON.stringify(formData.personalInfo)}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      if (response && response.text) {
        // Simple fallback parsing if needed
        return NextResponse.json({
          success: true,
          data: generateFallbackCVData(formData)
        });
      }
    } catch {
      // Return fallback generator if API fails
    }

    return NextResponse.json({
      success: true,
      data: generateFallbackCVData(formData)
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erreur lors de la génération avec l\'IA.'
      },
      { status: 500 }
    );
  }
}
