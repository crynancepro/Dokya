/**
 * API Route: /api/moneyfusion/checkout
 * 100% autonome - Compatible Vercel Serverless Function & Next.js App Router
 * Capture obligatoire du téléphone Mobile Money et montant > 0 FCFA
 */

import { db } from '../../lib/firebaseAdmin.js';

interface MoneyFusionRequestBody {
  amount?: number | string;
  totalPrice?: number | string;
  phoneNumber?: string;
  userPhone?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  type?: string;
  [key: string]: any;
}

export async function processMoneyFusionCheckout(body: MoneyFusionRequestBody) {
  const {
    amount,
    totalPrice,
    phoneNumber = '',
    userPhone = '',
    userId = '',
    userEmail = '',
    userName = '',
    customer = {}
  } = body || {};

  const rawAmount = amount !== undefined ? amount : (totalPrice !== undefined ? totalPrice : 0);
  const numericAmount = Number(rawAmount);

  // 1. Validation : numericAmount > 0
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Montant de paiement invalide. Le montant doit être supérieur à 0 FCFA.'
      }
    };
  }

  // 2. Validation : phoneNumber obligatoire
  const targetPhone = String(phoneNumber || userPhone || customer.phone || '').trim();
  if (!targetPhone) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Le numéro de téléphone (pour le paiement Mobile Money) est obligatoire.'
      }
    };
  }

  const targetUserId = String(userId || 'guest').trim() || 'guest';
  const targetUserEmail = String(userEmail || customer.email || '').trim();
  const targetName = String(userName || customer.name || 'Utilisateur').trim() || 'Utilisateur';

  const paymentId = `MF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  // 3. Création de la transaction dans Firestore 'transactions' avec statut PENDING
  if (db && typeof db.collection === 'function') {
    try {
      const pendingTx = {
        transactionId: paymentId,
        id: paymentId,
        userId: targetUserId,
        userEmail: targetUserEmail,
        userName: targetName,
        phoneNumber: targetPhone,
        userPhone: targetPhone,
        type: 'wallet_recharge',
        resolvedType: 'wallet',
        typeLabel: 'Recharge Solde',
        amount: numericAmount,
        expectedAmount: numericAmount,
        currency: 'XOF',
        status: 'PENDING',
        paymentGateway: 'Money Fusion',
        paymentMethod: 'moneyfusion',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      await db.collection('transactions').doc(paymentId).set(pendingTx, { merge: true });
      console.log(`[Checkout API] Transaction PENDING enregistrée dans Firestore: ${paymentId} (${numericAmount} FCFA, tel: ${targetPhone})`);
    } catch (dbErr: any) {
      console.warn('[Checkout API] Warning Firestore save:', dbErr?.message);
    }
  }

  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || 'https://dokya-seven.vercel.app').replace(/\/$/, '');
  const returnUrl = `${appBaseUrl}/dashboard?payment=return&transactionId=${paymentId}&type=wallet&amount=${numericAmount}`;
  const webhookUrl = `${appBaseUrl}/api/webhooks/moneyfusion`;

  const apiKey = process.env.MONEYFUSION_API_KEY;
  let targetEndpoint = (process.env.MONEYFUSION_API_URL || 'https://api.moneyfusion.net').trim();
  if (targetEndpoint === 'https://api.moneyfusion.net' || targetEndpoint === 'https://api.moneyfusion.net/') {
    targetEndpoint = 'https://api.moneyfusion.net/api/v1/payments';
  }

  // 4. Transmission à Money Fusion avec montant exact, numéro de téléphone et métadonnées
  const paymentData = {
    amount: Number(numericAmount),
    totalPrice: Number(numericAmount),
    article: [
      { "Rechargement Wallet Dokya": Number(numericAmount) }
    ],
    personal_Info: [
      {
        transactionId: paymentId,
        userId: targetUserId,
        userEmail: targetUserEmail,
        userName: targetName,
        phoneNumber: targetPhone,
        amount: Number(numericAmount),
        type: 'wallet_recharge'
      }
    ],
    numeroSend: targetPhone,
    nomclient: targetName,
    return_url: returnUrl,
    webhook_url: webhookUrl
  };

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
          // Sauvegarder le token Money Fusion officiel dans la transaction Firestore
          if (db && typeof db.collection === 'function') {
            try {
              await db.collection('transactions').doc(paymentId).set({
                token: data.token || null,
                tokenPay: data.token || null,
                checkoutUrl: checkoutUrl,
                status: 'PENDING',
                isProcessed: false,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } catch (_e) {}
          }

          console.log(`[Checkout API] Guichet Money Fusion obtenu avec succès: ${checkoutUrl} (token: ${data.token})`);
          return {
            status: 200,
            data: {
              success: true,
              url: checkoutUrl,
              token: data.token || paymentId,
              transactionId: paymentId,
              amount: numericAmount,
              provider: 'moneyfusion'
            }
          };
        }
      }
      console.warn('[Checkout API] Échec réponse Money Fusion:', data);
      return {
        status: 400,
        data: {
          success: false,
          error: data.message || "Échec de l'initialisation du paiement chez Money Fusion."
        }
      };
    } catch (err: any) {
      console.error('[Checkout API] Erreur appel Money Fusion:', err?.message);
      return {
        status: 502,
        data: {
          success: false,
          error: "Erreur de communication avec le guichet Money Fusion. Veuillez réessayer."
        }
      };
    }
  }

  return {
    status: 500,
    data: {
      success: false,
      error: "Service Money Fusion non configuré sur le serveur."
    }
  };
}

export default async function handler(req: any, res?: any) {
  if (!res || typeof res.status !== 'function') {
    const body = await req.json().catch(() => ({}));
    const result = await processMoneyFusionCheckout(body);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const result = await processMoneyFusionCheckout(req.body || {});
  return res.status(result.status).json(result.data);
}
