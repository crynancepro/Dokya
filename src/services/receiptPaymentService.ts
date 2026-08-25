/**
 * Service de validation de paiement par analyse d'image de reçu (OCR IA)
 * Analyse les reçus officiels Wave et Orange Money avec Gemini Vision
 */

import { ReceiptVerificationResult } from '../types';

export interface VerifyReceiptParams {
  file: File;
  expectedAmount: number;
  documentTitle?: string;
  userId?: string;
  userEmail?: string;
  purpose?: 'document_unlock' | 'wallet_recharge' | 'pack_purchase' | string;
}


/**
 * Convertit un fichier image en Base64
 */
export function fileToBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) {
        return reject(new Error("Impossible de lire le fichier image."));
      }
      const match = result.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        resolve({
          mimeType: match[1],
          base64Data: match[2]
        });
      } else {
        // Fallback
        resolve({
          mimeType: file.type || 'image/jpeg',
          base64Data: result.split(',')[1] || result
        });
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Envoie le reçu au backend pour analyse OCR IA et validation en temps réel
 */
export async function verifyReceiptImage(params: VerifyReceiptParams): Promise<ReceiptVerificationResult> {
  try {
    const { base64Data, mimeType } = await fileToBase64(params.file);

    const response = await fetch('/api/payment/verify-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType,
        expectedAmount: params.expectedAmount,
        documentTitle: params.documentTitle || 'Document Professionnel Dokya',
        userId: params.userId || 'guest-user',
        userEmail: params.userEmail || 'candidat@dokya.sn',
        purpose: params.purpose || 'document_unlock'
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.success) {
      const errorMessage = data?.error || data?.message || "Reçu non valide ou déjà utilisé.";
      return {
        success: false,
        status: 'REJECTED',
        error: errorMessage,
        errorCode: data?.errorCode || 'INVALID_RECEIPT',
        message: errorMessage
      };
    }

    return {
      success: true,
      status: 'COMPLETED',
      method: data.method || 'wave',
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency || 'XOF',
      date: data.date,
      senderPhone: data.senderPhone,
      recipientNameOrPhone: data.recipientNameOrPhone,
      newBalance: data.newBalance,
      message: data.message || "Paiement validé avec succès par l'analyse IA !"
    };
  } catch (err: any) {
    console.error('[Receipt Verification Error]:', err);
    return {
      success: false,
      status: 'INVALID',
      error: err?.message || "Impossible d'analyser le reçu. Veuillez vérifier votre connexion et réessayer.",
      errorCode: 'AI_ERROR'
    };
  }
}
