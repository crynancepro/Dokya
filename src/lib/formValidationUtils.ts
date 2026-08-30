import { CVFormData, BusinessDocData, EbookData } from '../types';

export interface FormValidationReport {
  score: number; // 0 to 100
  status: 'optimal' | 'sufficient' | 'thin';
  statusLabel: string;
  badgeColor: string;
  badgeBg: string;
  missingCrucialFields: string[];
  suggestions: string[];
  aiEnrichmentAvailable: boolean;
  aiEnrichmentMessage: string;
}

/**
 * Intelligent real-time validation for CV & Letter forms
 */
export function validateCVForm(formData: CVFormData): FormValidationReport {
  let score = 0;
  const missingCrucialFields: string[] = [];
  const suggestions: string[] = [];

  const p = formData?.personalInfo || ({} as any);

  // 1. Identity & Contact (30%)
  if (p.firstName?.trim() && p.lastName?.trim()) {
    score += 15;
  } else {
    missingCrucialFields.push('Nom complet');
  }

  if (p.targetJob?.trim()) {
    score += 15;
  } else {
    missingCrucialFields.push('Titre du poste visé');
    suggestions.push('Indiquez le titre exact du poste convoité pour calibrer les mots-clés ATS.');
  }

  if (p.email?.trim() || p.phone?.trim()) {
    score += 10;
  } else {
    missingCrucialFields.push('Coordonnées de contact (Email / Téléphone)');
  }

  // 2. Experiences (30%)
  const experiences = formData.experiences || [];
  if (experiences.length >= 2) {
    const hasThoroughDesc = experiences.some(e => (e.description || '').trim().length > 50);
    score += hasThoroughDesc ? 30 : 18;
    if (!hasThoroughDesc) {
      suggestions.push('Détaillez vos réalisations avec des chiffres (l\'IA complétera automatiquement les verbes d\'action).');
    }
  } else if (experiences.length === 1) {
    score += 15;
    suggestions.push('Ajouter une 2ème expérience renforce la densité visuelle du CV.');
  } else {
    missingCrucialFields.push('Expériences professionnelles');
    suggestions.push('Aucune expérience saisie : l\'IA générera des missions crédibles et complètes.');
  }

  // 3. Skills (15%)
  const skills = formData.skills || [];
  const totalSkillsCount = skills.reduce((acc, cat) => acc + (cat.skills ? cat.skills.length : 0), 0);
  if (totalSkillsCount >= 6) {
    score += 15;
  } else if (totalSkillsCount >= 1) {
    score += 8;
    suggestions.push('Ajoutez plus de compétences techniques et soft skills pour atteindre un score ATS > 90%.');
  } else {
    missingCrucialFields.push('Compétences clés');
    suggestions.push('Compétences vides : l\'IA ajoutera le pack complet de compétences pour ce métier.');
  }

  // 4. Education & Training (10%)
  const education = formData.education || [];
  if (education.length >= 1 && education[0].degree?.trim()) {
    score += 10;
  } else {
    suggestions.push('Ajoutez votre dernier diplôme ou certification.');
  }

  // 5. Hobbies & Interests (5%)
  const hobbies = formData.hobbies || [];
  const hasHobbies = hobbies.some(h => (typeof h === 'string' ? h.trim() : ''));
  if (hasHobbies) {
    score += 5;
  } else {
    suggestions.push('Centres d\'intérêt vides : l\'IA injectera 3-4 loisirs valorisants (sport, stratégie, veille).');
  }

  let status: 'optimal' | 'sufficient' | 'thin' = 'thin';
  let statusLabel = 'Contenu Minimal (Enrichissement IA Recommandé)';
  let badgeColor = 'text-amber-700';
  let badgeBg = 'bg-amber-50 border-amber-200';

  if (score >= 80) {
    status = 'optimal';
    statusLabel = 'Excellente Complétude ATS';
    badgeColor = 'text-emerald-700';
    badgeBg = 'bg-emerald-50 border-emerald-200';
  } else if (score >= 50) {
    status = 'sufficient';
    statusLabel = 'Contenu Standard (Optimisable par l\'IA)';
    badgeColor = 'text-blue-700';
    badgeBg = 'bg-blue-50 border-blue-200';
  }

  return {
    score: Math.min(100, score),
    status,
    statusLabel,
    badgeColor,
    badgeBg,
    missingCrucialFields,
    suggestions,
    aiEnrichmentAvailable: true,
    aiEnrichmentMessage: 'L\'IA Gemini comblera automatiquement les lacunes (profil, puces d\'expériences, compétences, loisirs) lors de la génération.'
  };
}

/**
 * Intelligent real-time validation for Devis & Factures forms
 */
export function validateBusinessDoc(docData: BusinessDocData): FormValidationReport {
  let score = 0;
  const missingCrucialFields: string[] = [];
  const suggestions: string[] = [];
  const docTypeLabel = docData.type === 'devis' ? 'Devis' : 'Facture';

  // 1. Issuer / Entreprise émettrice (25%)
  const issuer = docData.issuer || ({} as any);
  if (issuer.companyName?.trim() || issuer.name?.trim()) {
    score += 15;
  } else {
    missingCrucialFields.push('Nom de votre entreprise / Prestataire');
  }

  if (issuer.phone?.trim() || issuer.email?.trim()) {
    score += 10;
  } else {
    suggestions.push('Renseignez vos coordonnées (téléphone/email) pour faciliter le contact client.');
  }

  // 2. Client Info (25%)
  const client = docData.client || ({} as any);
  if (client.companyName?.trim() || client.name?.trim()) {
    score += 15;
  } else {
    missingCrucialFields.push('Nom ou Entreprise du Client');
    suggestions.push('Précisez l\'identité du client destinataire du document.');
  }

  if (client.phone?.trim() || client.email?.trim() || client.address?.trim()) {
    score += 10;
  } else {
    suggestions.push('Ajoutez l\'adresse ou le contact du client pour la validité comptable.');
  }

  // 3. Line Items / Prestations (35%)
  const items = docData.items || [];
  const validItems = items.filter(it => it.description?.trim() && Number(it.quantity) > 0 && Number(it.unitPrice) > 0);
  
  if (validItems.length >= 1) {
    score += 25;
    if (validItems.length >= 3) score += 10;
  } else {
    missingCrucialFields.push('Lignes de prestations / Produits chiffrés');
    suggestions.push('Ajoutez au moins une ligne de prestation avec désignation, quantité et prix unitaire.');
  }

  // 4. Payment terms & legal notes (15%)
  const payment = docData.paymentInfo || ({} as any);
  if (payment.bankName?.trim() || payment.rib?.trim() || payment.orangeMoney?.trim() || payment.wave?.trim() || payment.notes?.trim()) {
    score += 15;
  } else {
    suggestions.push('Indiquez vos modalités de règlement (Wave, Orange Money ou RIB bancaire).');
  }

  let status: 'optimal' | 'sufficient' | 'thin' = 'thin';
  let statusLabel = 'Informations Incomplètes';
  let badgeColor = 'text-amber-700';
  let badgeBg = 'bg-amber-50 border-amber-200';

  if (score >= 80) {
    status = 'optimal';
    statusLabel = 'Document Parfaitement Conforme';
    badgeColor = 'text-emerald-700';
    badgeBg = 'bg-emerald-50 border-emerald-200';
  } else if (score >= 50) {
    status = 'sufficient';
    statusLabel = 'Document Prêt (Quelques détails optionnels)';
    badgeColor = 'text-blue-700';
    badgeBg = 'bg-blue-50 border-blue-200';
  }

  return {
    score: Math.min(100, score),
    status,
    statusLabel,
    badgeColor,
    badgeBg,
    missingCrucialFields,
    suggestions,
    aiEnrichmentAvailable: true,
    aiEnrichmentMessage: `L'assistant IA peut formuler des descriptions de prestations professionnelles et calculer automatiquement TVA et remises pour ce ${docTypeLabel}.`
  };
}

/**
 * Intelligent validation for Cover Letters
 */
export function validateLetterForm(formData: CVFormData): FormValidationReport {
  let score = 0;
  const missingCrucialFields: string[] = [];
  const suggestions: string[] = [];

  const p = formData?.personalInfo || ({} as any);

  if (p.firstName?.trim() && p.lastName?.trim()) {
    score += 20;
  } else {
    missingCrucialFields.push('Nom & Prénom');
  }

  if (p.targetJob?.trim()) {
    score += 25;
  } else {
    missingCrucialFields.push('Poste visé');
    suggestions.push('Précisez le poste convoité.');
  }

  if (formData.targetCompany?.trim()) {
    score += 25;
  } else {
    missingCrucialFields.push('Entreprise destinataire');
    suggestions.push('Indiquez le nom de l\'entreprise cible.');
  }

  const instructions = (formData.letterInstructions || formData.highlightsSummary || '').trim();
  if (instructions.length >= 20) {
    score += 30;
  } else {
    suggestions.push('Ajoutez des consignes ou points forts spécifiques pour personnaliser l\'accroche.');
  }

  let status: 'optimal' | 'sufficient' | 'thin' = 'thin';
  let statusLabel = 'Paramètres Minimaux';
  let badgeColor = 'text-amber-700';
  let badgeBg = 'bg-amber-50 border-amber-200';

  if (score >= 70) {
    status = 'optimal';
    statusLabel = 'Paramètres Idéaux';
    badgeColor = 'text-emerald-700';
    badgeBg = 'bg-emerald-50 border-emerald-200';
  } else if (score >= 40) {
    status = 'sufficient';
    statusLabel = 'Paramètres Suffisants';
    badgeColor = 'text-blue-700';
    badgeBg = 'bg-blue-50 border-blue-200';
  }

  return {
    score: Math.min(100, score),
    status,
    statusLabel,
    badgeColor,
    badgeBg,
    missingCrucialFields,
    suggestions,
    aiEnrichmentAvailable: true,
    aiEnrichmentMessage: 'L\'IA rédigera une lettre complète et percutante de 300+ mots au format VOUS / MOI / NOUS.'
  };
}

/**
 * Intelligent validation for Ebook Generator
 */
export function validateEbookForm(ebookData: EbookData): FormValidationReport {
  let score = 0;
  const missingCrucialFields: string[] = [];
  const suggestions: string[] = [];

  if (ebookData.title?.trim()) score += 30;
  else missingCrucialFields.push('Titre de l\'ebook');

  if (ebookData.author?.trim()) score += 20;
  else missingCrucialFields.push('Nom de l\'auteur');

  if (ebookData.summaryOrPrompt?.trim() && ebookData.summaryOrPrompt.trim().length > 30) {
    score += 30;
  } else {
    suggestions.push('Détaillez le sujet ou les points clés pour un ebook plus riche.');
  }

  if (ebookData.targetAudience?.trim()) score += 10;
  if (ebookData.genre?.trim()) score += 10;

  let status: 'optimal' | 'sufficient' | 'thin' = 'thin';
  let statusLabel = 'Prompt Minimal';
  let badgeColor = 'text-amber-700';
  let badgeBg = 'bg-amber-50 border-amber-200';

  if (score >= 80) {
    status = 'optimal';
    statusLabel = 'Prompt Détaillé & Optimal';
    badgeColor = 'text-emerald-700';
    badgeBg = 'bg-emerald-50 border-emerald-200';
  } else if (score >= 50) {
    status = 'sufficient';
    statusLabel = 'Prompt Suffisant';
    badgeColor = 'text-blue-700';
    badgeBg = 'bg-blue-50 border-blue-200';
  }

  return {
    score: Math.min(100, score),
    status,
    statusLabel,
    badgeColor,
    badgeBg,
    missingCrucialFields,
    suggestions,
    aiEnrichmentAvailable: true,
    aiEnrichmentMessage: 'L\'IA Gemini structurera la table des matières complète et rédigera les chapitres enrichis.'
  };
}
