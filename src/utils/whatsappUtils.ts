/**
 * Utilitaires pour le formatage et le partage WhatsApp 1-Clic
 * Pôle Dokya Business (Sénégal & Zone UEMOA / International)
 */

export function cleanPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return '';
  // Enlève espaces, tirets, parenthèses, points
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Enlève l'indicatif 00 de tête
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Enlève le signe +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Si numéro national sénégalais (9 chiffres commençant par 7 : 77, 78, 76, 70, 75)
  if (/^7[05678]\d{7}$/.test(cleaned)) {
    cleaned = `221${cleaned}`;
  }

  return cleaned;
}

export interface InvoiceWhatsAppParams {
  clientName: string;
  phone: string;
  docNumber: string;
  type: 'devis' | 'facture';
  totalTTC: number;
  currency?: string;
  dueDate?: string;
  issuerName?: string;
  isPaid?: boolean;
}

export function generateInvoiceWhatsAppLink({
  clientName,
  phone,
  docNumber,
  type,
  totalTTC,
  currency = 'FCFA',
  dueDate,
  issuerName,
  isPaid
}: InvoiceWhatsAppParams): string {
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  const docTypeLabel = type === 'devis' ? 'Devis' : 'Facture';
  const formattedAmount = Number(totalTTC || 0).toLocaleString('fr-FR');
  const greeting = clientName ? `Bonjour ${clientName}` : 'Bonjour';
  const fromText = issuerName ? ` de la part de *${issuerName}*` : '';

  let message = `${greeting},\n\n`;
  message += `Voici les détails de votre ${docTypeLabel} N° *${docNumber}*${fromText} :\n`;
  message += `💰 *Montant total :* ${formattedAmount} ${currency}\n`;

  if (type === 'facture') {
    message += `📋 *Statut :* ${isPaid ? '✅ PAYÉE' : '⏳ EN ATTENTE DE RÈGLEMENT'}\n`;
    if (dueDate && !isPaid) {
      message += `📅 *Date d'échéance :* ${dueDate}\n`;
    }
  }

  message += `\nNous restons à votre entière disposition pour toute question.\n`;
  message += `Merci de votre confiance !`;

  const encodedText = encodeURIComponent(message);
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

export interface StatementWhatsAppParams {
  clientName: string;
  phone: string;
  totalInvoiced: number;
  unpaidAmount: number;
  currency?: string;
  issuerName?: string;
  invoicesCount: number;
}

export function generateCustomerStatementWhatsAppLink({
  clientName,
  phone,
  totalInvoiced,
  unpaidAmount,
  currency = 'FCFA',
  issuerName,
  invoicesCount
}: StatementWhatsAppParams): string {
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  const formattedTotal = Number(totalInvoiced || 0).toLocaleString('fr-FR');
  const formattedUnpaid = Number(unpaidAmount || 0).toLocaleString('fr-FR');
  const greeting = clientName ? `Bonjour ${clientName}` : 'Bonjour';
  const fromText = issuerName ? ` de la part de *${issuerName}*` : '';

  let message = `${greeting},\n\n`;
  message += `Voici le récapitulatif de votre compte client${fromText} :\n`;
  message += `📄 *Factures émises :* ${invoicesCount}\n`;
  message += `💳 *Total facturé :* ${formattedTotal} ${currency}\n`;
  
  if (unpaidAmount > 0) {
    message += `⚠️ *Solde restant dû :* ${formattedUnpaid} ${currency}\n`;
    message += `\nMerci de bien vouloir procéder au règlement dès que possible.`;
  } else {
    message += `✅ *Situation financière :* À jour (Aucun impayé)\n`;
    message += `\nMerci pour votre fidélité !`;
  }

  const encodedText = encodeURIComponent(message);
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

export interface DocumentShareWhatsAppParams {
  title: string;
  type: 'cv' | 'letter' | 'devis' | 'facture' | 'pack_business' | 'ebook' | 'interview_prep' | string;
  docId?: string;
  recipientPhone?: string;
  recipientName?: string;
  targetJobOrCompany?: string;
  docNumber?: string;
  totalAmount?: number;
  currency?: string;
  paymentStatus?: 'PAID' | 'UNPAID' | string;
  quoteStatus?: string;
  dueDate?: string;
  customShareUrl?: string;
}

/**
 * Génère un lien Web WhatsApp officiel (https://wa.me/?text=...)
 * formaté avec le titre du document, les métadonnées clés et le lien sécurisé.
 */
export function generateDocumentWhatsAppShareLink({
  title,
  type,
  docId,
  recipientPhone,
  recipientName,
  targetJobOrCompany,
  docNumber,
  totalAmount,
  currency = 'FCFA',
  paymentStatus,
  quoteStatus,
  dueDate,
  customShareUrl
}: DocumentShareWhatsAppParams): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dokya.sn';
  const cleanPhone = recipientPhone ? cleanPhoneNumberForWhatsApp(recipientPhone) : '';
  
  // Formatage du lien sécurisé vers le document
  const shareUrl = customShareUrl || (docId 
    ? `${origin}/?docId=${encodeURIComponent(docId)}&type=${encodeURIComponent(type || 'cv')}`
    : origin);

  const docTypeLabels: Record<string, string> = {
    cv: 'CV Professionnel ATS',
    letter: 'Lettre de Motivation',
    devis: 'Devis Commercial Pro',
    facture: 'Facture Client',
    pack_business: 'Pack Business (Devis & Facture)',
    ebook: 'Livre Numérique (Ebook Pro)',
    interview_prep: 'Fiche Coaching Entretien RH'
  };

  const typeIcons: Record<string, string> = {
    cv: '📄',
    letter: '✉️',
    devis: '📑',
    facture: '🧾',
    pack_business: '💼',
    ebook: '📚',
    interview_prep: '🎯'
  };

  const label = docTypeLabels[type] || 'Document Professionnel';
  const icon = typeIcons[type] || '📄';

  let message = `${icon} *${label.toUpperCase()}*\n`;
  message += `📌 *Titre :* ${title.trim()}\n`;

  if (recipientName) {
    if (type === 'facture' || type === 'devis') {
      message += `👤 *Client :* ${recipientName}\n`;
    } else {
      message += `👤 *Titulaire / Auteur :* ${recipientName}\n`;
    }
  }

  if (docNumber) {
    message += `🔢 *Réf. N° :* ${docNumber}\n`;
  }

  if (targetJobOrCompany) {
    message += `🏢 *Poste / Entreprise :* ${targetJobOrCompany}\n`;
  }

  if (typeof totalAmount === 'number' && totalAmount > 0) {
    message += `💰 *Montant Total :* ${Number(totalAmount).toLocaleString('fr-FR')} ${currency}\n`;
  }

  if (type === 'facture' && paymentStatus) {
    const isPaid = paymentStatus === 'PAID';
    message += `💳 *Statut de Règlement :* ${isPaid ? '✅ PAYÉE' : '⏳ EN ATTENTE DE RÈGLEMENT'}\n`;
    if (dueDate && !isPaid) {
      message += `📅 *Échéance :* ${dueDate}\n`;
    }
  } else if (type === 'devis' && quoteStatus) {
    message += `📋 *Statut Devis :* ${quoteStatus}\n`;
  }

  message += `\n🔗 *Lien sécurisé pour consulter le document :*\n${shareUrl}\n\n`;
  message += `_Généré et certifié sur la plateforme Dokya AI Studio._`;

  const encodedText = encodeURIComponent(message);
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

/**
 * Ouvre directement l'application WhatsApp dans un nouvel onglet avec le message formaté
 */
export function openDocumentWhatsAppShare(params: DocumentShareWhatsAppParams): void {
  const url = generateDocumentWhatsAppShareLink(params);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

