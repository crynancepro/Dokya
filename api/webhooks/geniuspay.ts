/**
 * Standalone Vercel Serverless Function: /api/webhooks/geniuspay
 * Traitement automatisé des notifications Webhook GeniusPay
 * Met à jour le solde / abonnement utilisateur et enregistre la transaction
 */
import crypto from 'crypto';

interface GeniusPayWebhookPayload {
  event?: string;
  type?: string;
  status?: string;
  data?: {
    id?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
    payment_method?: string;
    customer?: {
      name?: string;
      email?: string;
      phone?: string;
    };
    metadata?: {
      userId?: string;
      userEmail?: string;
      affiliateId?: string;
      referredBy?: string;
      planType?: string;
      purpose?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

// Configuration Firestore REST API
const FIRESTORE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';
const FIRESTORE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDrIGI9XiDRwq8Q7WDEHcbmhQGzy38skc4';

/**
 * Mise à jour sécurisée du document utilisateur dans Firestore via l'API REST
 */
async function updateUserInFirestore(userId: string, updateData: {
  subscriptionStatus?: string;
  subscription?: any;
  balanceIncrement?: number;
  creditsIncrement?: number;
}) {
  if (!userId || userId === 'anonymous') return;

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/users/${userId}?key=${FIRESTORE_API_KEY}`;

  try {
    // 1. Récupération préalable du document utilisateur si besoin de cumuler
    const getRes = await fetch(baseUrl);
    let existingData: any = {};
    if (getRes.ok) {
      existingData = await getRes.json();
    }

    const currentBalance = Number(existingData?.fields?.balance?.integerValue || existingData?.fields?.balance?.doubleValue || 0);
    const newBalance = currentBalance + (updateData.balanceIncrement || 0);

    const now = new Date();
    const expiresDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut

    // Construction des champs Firestore au format protobuf REST
    const fields: any = {
      subscriptionStatus: { stringValue: updateData.subscriptionStatus || 'unlimited' },
      lastPaymentAt: { timestampValue: now.toISOString() },
      lastPaymentProvider: { stringValue: 'geniuspay' },
      balance: { integerValue: String(Math.max(0, newBalance)) },
      updatedAt: { timestampValue: now.toISOString() }
    };

    if (updateData.subscription) {
      fields.subscription = {
        mapValue: {
          fields: {
            planId: { stringValue: updateData.subscription.planId || 'PASS_VIP' },
            status: { stringValue: 'ACTIVE' },
            activatedAt: { timestampValue: now.toISOString() },
            expiresAt: { timestampValue: (updateData.subscription.expiresAt || expiresDate).toISOString() },
            pricePaid: { integerValue: String(updateData.subscription.pricePaid || 5000) },
            paymentMethod: { stringValue: 'geniuspay' }
          }
        }
      };
    }

    // PATCH avec updateMask
    const fieldMasks = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const patchUrl = `${baseUrl}&${fieldMasks}`;

    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (patchRes.ok) {
      console.log(`[GeniusPay Webhook] Utilisateur ${userId} mis à jour avec succès dans Firestore.`);
    } else {
      console.warn(`[GeniusPay Webhook] Échec partiel mise à jour Firestore:`, await patchRes.text());
    }
  } catch (err) {
    console.error(`[GeniusPay Webhook] Erreur mise à jour Firestore utilisateur:`, err);
  }
}

/**
 * Enregistrement de la transaction dans Firestore via l'API REST
 */
async function recordTransactionInFirestore(txData: any) {
  const txId = txData.id || `GP-${Date.now()}`;
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/transactions?documentId=${encodeURIComponent(txId)}&key=${FIRESTORE_API_KEY}`;

  try {
    const fields: any = {
      id: { stringValue: txId },
      transactionId: { stringValue: txId },
      userId: { stringValue: txData.userId || 'anonymous' },
      userName: { stringValue: txData.userName || 'Client Dokya' },
      userEmail: { stringValue: txData.userEmail || '' },
      userPhone: { stringValue: txData.userPhone || '' },
      amount: { integerValue: String(Math.round(Number(txData.amount) || 0)) },
      expectedAmount: { integerValue: String(Math.round(Number(txData.amount) || 0)) },
      currency: { stringValue: txData.currency || 'XOF' },
      paymentMethod: { stringValue: 'geniuspay' },
      operator: { stringValue: txData.operator || 'geniuspay' },
      status: { stringValue: 'COMPLETED' },
      type: { stringValue: txData.type || 'SUBSCRIPTION_PURCHASE' },
      planId: { stringValue: txData.planId || 'PASS_VIP' },
      description: { stringValue: txData.description || `Abonnement ${txData.planId || 'Pass VIP'} - GeniusPay` },
      createdAt: { timestampValue: new Date().toISOString() },
      completedAt: { timestampValue: new Date().toISOString() }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (res.ok) {
      console.log(`[GeniusPay Webhook] Transaction ${txId} enregistrée dans Firestore.`);
    }
  } catch (err) {
    console.error(`[GeniusPay Webhook] Erreur enregistrement transaction Firestore:`, err);
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, x-webhook-signature, x-webhook-timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    let payload: GeniusPayWebhookPayload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }

    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const webhookSecret = process.env.GENIUSPAY_WEBHOOK_SECRET;

    // Vérification de la signature HMAC si le secret est configuré
    if (webhookSecret && signature) {
      const rawString = JSON.stringify(payload);
      const payloadToSign = timestamp ? `${timestamp}.${rawString}` : rawString;
      const expected = crypto.createHmac('sha256', webhookSecret).update(payloadToSign).digest('hex');
      const altExpected = timestamp ? crypto.createHmac('sha256', webhookSecret).update(`${timestamp}${rawString}`).digest('hex') : expected;

      if (signature !== expected && signature !== altExpected) {
        console.error('[GeniusPay Webhook] Signature HMAC invalide');
        return res.status(403).json({ error: 'Signature invalide' });
      }
    }

    const event = payload.event || payload.type;
    const paymentData = payload.data || payload;
    const paymentStatus = (paymentData.status || '').toLowerCase();

    // Détection des statuts de succès autorisés par GeniusPay
    const isSuccess =
      event === 'payment.success' ||
      event === 'transaction.successful' ||
      paymentStatus === 'completed' ||
      paymentStatus === 'success' ||
      paymentStatus === 'paid';

    console.log('[GeniusPay Webhook] Événement reçu:', {
      event,
      status: paymentStatus,
      isSuccess,
      paymentId: paymentData.id
    });

    if (!isSuccess) {
      // Confirmer la réception à GeniusPay même pour les événements préliminaires
      return res.status(200).json({
        received: true,
        status: 'IGNORED_OR_PENDING',
        event,
        paymentStatus
      });
    }

    // Récupération des données clients et métadonnées
    const metadata = paymentData.metadata || {};
    const customer = paymentData.customer || {};
    const userId = metadata.userId || metadata.user_id;
    const userEmail = customer.email || metadata.userEmail || metadata.email || '';
    const userName = customer.name || metadata.userName || 'Client Dokya';
    const amount = Number(paymentData.amount || metadata.amount || 5000);
    const currency = paymentData.currency || 'XOF';
    const planType = metadata.planType || metadata.plan || 'PASS_VIP';
    const purpose = metadata.purpose || 'subscription_purchase';
    const referredBy = metadata.referredBy || metadata.affiliateId;
    const txId = paymentData.id || `GP-${Date.now()}`;

    // Mise à jour de l'utilisateur dans la base de données
    if (userId || userEmail) {
      const isRecharge = purpose === 'wallet_recharge' || planType === 'RECHARGE';
      
      let durationDays = 30;
      if (planType === 'annual' || planType === 'YEARLY') durationDays = 365;
      else if (planType === 'weekly') durationDays = 7;
      else if (planType === 'lifetime') durationDays = 36500;

      const now = new Date();
      const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      if (isRecharge) {
        await updateUserInFirestore(userId || userEmail, {
          balanceIncrement: amount
        });
      } else {
        await updateUserInFirestore(userId || userEmail, {
          subscriptionStatus: 'unlimited',
          subscription: {
            planId: planType,
            status: 'ACTIVE',
            expiresAt: expiresDate,
            pricePaid: amount
          }
        });
      }

      // Enregistrement de la transaction
      await recordTransactionInFirestore({
        id: txId,
        userId: userId || userEmail,
        userName,
        userEmail,
        userPhone: customer.phone || metadata.userPhone || metadata.phone || '',
        operator: paymentData.payment_method || 'geniuspay',
        description: paymentData.description || `Abonnement ${planType} - GeniusPay`,
        amount,
        currency,
        planId: planType,
        type: isRecharge ? 'WALLET_RECHARGE' : 'SUBSCRIPTION_PURCHASE'
      });

      // Gestion commission affiliation de 20% si parrain présent
      if (referredBy) {
        const commission = Math.round(amount * 0.20);
        await updateUserInFirestore(referredBy, {
          balanceIncrement: commission
        });
        console.log(`[GeniusPay Webhook] Commission parrain (${commission} XOF) créditée à ${referredBy}`);
      }
    }

    // Toujours renvoyer HTTP 200 à GeniusPay pour valider le webhook
    return res.status(200).json({
      success: true,
      received: true,
      status: 'PROCESSED',
      txId,
      userId: userId || userEmail,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[GeniusPay Webhook Fatal Error]:', error);
    // Renvoyer quand même 200 avec notification d'erreur interne pour éviter que GeniusPay bloque les webhooks
    return res.status(200).json({
      received: true,
      error: error.message || 'Erreur interne de traitement'
    });
  }
}
