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
