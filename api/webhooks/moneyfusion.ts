/**
 * Standalone Vercel Serverless Function: /api/webhooks/moneyfusion
 * Traitement automatisé des notifications Webhook Money Fusion
 */

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';
const FIRESTORE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDrIGI9XiDRwq8Q7WDEHcbmhQGzy38skc4';

function getDb() {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (serviceAccountKey) {
      try {
        const creds = JSON.parse(serviceAccountKey);
        initializeApp({
          credential: cert(creds),
          projectId: creds.project_id || FIRESTORE_PROJECT_ID
        });
      } catch (err: any) {
        console.warn('[Firebase Admin] Avertissement parsing clé de service:', err?.message);
        initializeApp({ projectId: FIRESTORE_PROJECT_ID });
      }
    } else {
      initializeApp({ projectId: FIRESTORE_PROJECT_ID });
    }
  }

  const app = getApp();
  return FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)'
    ? getFirestore(app, FIRESTORE_DATABASE_ID)
    : getFirestore(app);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  } else if (!body && typeof req.on === 'function') {
    const raw = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', (chunk: any) => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
    try { body = JSON.parse(raw); } catch { body = {}; }
  }
  body = body || {};

  // 3. LOGS POUR DÉBOGAGE
  console.log("Webhook payload reçu:", JSON.stringify(body));

  try {
    const personalInfo = Array.isArray(body.personal_Info) ? (body.personal_Info[0] || {}) : (body.personal_Info || {});
    const metadata = body.metadata || body.customData || {};

    const docId = String(body.docId || personalInfo.docId || metadata.docId || '').trim();
    const userId = String(body.userId || personalInfo.userId || metadata.userId || '').trim();
    const amount = Number(body.amount || body.totalPrice || personalInfo.amount || metadata.amount || 0);
    const type = String(body.type || personalInfo.type || metadata.type || '').trim().toLowerCase();
    const plan = String(body.plan || body.planId || personalInfo.planId || personalInfo.plan || metadata.planId || metadata.plan || '').trim();
    const rawStatus = body.statut ?? body.status ?? body.event ?? '';
    const status = String(rawStatus).toLowerCase();

    const txId = body.token || body.orderId || body.reference || body.id || `MF-${Date.now()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    const isApproved = status === 'true' || status === 'success' || status === 'paid' || status === 'completed' || status === 'approved' || rawStatus === true || rawStatus === 1;

    if (!isApproved && (status === 'cancel' || status === 'failed' || status === 'refused' || status === 'false')) {
      console.log(`[Money Fusion Webhook] Statut non validé (${status}), acquittement sans modification.`);
      return res.status(200).json({ status: "success" });
    }

    const db = getDb();

    // A. Rechargement de Solde
    const isWallet = type === 'wallet' || (!docId && !plan && amount > 0);
    if (isWallet && userId && userId !== 'guest') {
      console.log(`[Webhook - CAS A] Crédit portefeuille pour l'utilisateur ${userId} : +${amount} FCFA`);
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          walletBalance: FieldValue.increment(Number(amount)),
          balance: FieldValue.increment(Number(amount)),
          solde: FieldValue.increment(Number(amount)),
          lastPaymentAt: nowIso,
          lastPaymentProvider: 'Money Fusion',
          updatedAt: nowIso
        }, { merge: true });
      } catch (err: any) {
        console.error(`[Webhook - CAS A] Erreur Firebase Admin increment:`, err?.message);
        await fallbackUpdateUserBalance(userId, amount, nowIso);
      }

      try {
        await db.collection('transactions').doc(txId).set({
          id: txId,
          transactionId: txId,
          userId,
          amount: Number(amount),
          type: 'WALLET_RECHARGE',
          typeLabel: 'Rechargement Wallet',
          currency: 'XOF',
          status: 'COMPLETED',
          paymentGateway: 'Money Fusion',
          paymentMethod: 'moneyfusion',
          createdAt: nowIso,
          completedAt: nowIso
        }, { merge: true });
      } catch (txErr: any) {
        console.error(`[Webhook - CAS A] Erreur log transaction:`, txErr?.message);
      }
    }

    // B. Déblocage de Document
    if (docId) {
      console.log(`[Webhook - CAS B] Déblocage du document ${docId}`);
      try {
        const docRef = db.collection('user_documents').doc(docId);
        await docRef.set({
          isUnlocked: true,
          status: "UNLOCKED",
          paymentGateway: "Money Fusion",
          isPaid: true,
          unlocked: true,
          paidAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });
      } catch (err: any) {
        console.error(`[Webhook - CAS B] Erreur Firebase Admin doc:`, err?.message);
        await fallbackUnlockDoc(docId, nowIso);
      }

      if (userId && userId !== 'guest') {
        try {
          const userRef = db.collection('users').doc(userId);
          await userRef.set({
            purchasedDocIds: FieldValue.arrayUnion(docId),
            lastPaymentAt: nowIso,
            lastPaymentProvider: "Money Fusion",
            updatedAt: nowIso
          }, { merge: true });
        } catch (_e) {}
      }

      try {
        await db.collection('transactions').doc(txId).set({
          id: txId,
          transactionId: txId,
          userId: userId || 'anonymous',
          targetDocId: docId,
          amount: Number(amount || 1000),
          type: 'DOCUMENT_UNLOCK',
          typeLabel: 'Document',
          currency: 'XOF',
          status: 'COMPLETED',
          paymentGateway: 'Money Fusion',
          paymentMethod: 'moneyfusion',
          description: `Déblocage Document (${docId}) - Money Fusion`,
          createdAt: nowIso,
          completedAt: nowIso
        }, { merge: true });
      } catch (txErr: any) {
        console.error(`[Webhook - CAS B] Erreur log transaction:`, txErr?.message);
      }
    }

    // C. Abonnement VIP
    const planId = plan || (type === 'subscription' ? 'PASS_VIP' : '');
    const isSubscription = Boolean(planId) || type === 'subscription';

    if (isSubscription && userId && userId !== 'guest') {
      const resolvedPlan = planId || 'PASS_VIP';
      const durationDays = resolvedPlan === 'annual' || amount >= 15000 ? 365 : (resolvedPlan === 'weekly' ? 7 : 30);
      const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      console.log(`[Webhook - CAS C] Activation Abonnement VIP pour ${userId} (Plan: ${resolvedPlan})`);
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: resolvedPlan,
          lastPaymentAt: nowIso,
          lastPaymentProvider: "Money Fusion",
          updatedAt: nowIso,
          subscription: {
            planId: resolvedPlan,
            status: "ACTIVE",
            activatedAt: nowIso,
            expiresAt: expiresDate,
            pricePaid: Number(amount),
            paymentMethod: "Money Fusion",
            paymentGateway: "Money Fusion"
          }
        }, { merge: true });
      } catch (err: any) {
        console.error(`[Webhook - CAS C] Erreur Firebase Admin sub:`, err?.message);
        await fallbackActivateSubscription(userId, resolvedPlan, expiresDate, nowIso);
      }

      try {
        await db.collection('transactions').doc(txId).set({
          id: txId,
          transactionId: txId,
          userId,
          planId: resolvedPlan,
          amount: Number(amount),
          type: 'SUBSCRIPTION_PURCHASE',
          typeLabel: 'Abonnement VIP',
          currency: 'XOF',
          status: 'COMPLETED',
          paymentGateway: 'Money Fusion',
          paymentMethod: 'moneyfusion',
          description: `Abonnement VIP (${resolvedPlan}) - Money Fusion`,
          createdAt: nowIso,
          completedAt: nowIso
        }, { merge: true });
      } catch (txErr: any) {
        console.error(`[Webhook - CAS C] Erreur log transaction:`, txErr?.message);
      }
    }

  } catch (globalErr: any) {
    console.error('[Money Fusion Webhook Error]:', globalErr);
  }

  // Renvoie toujours status 200 success
  return res.status(200).json({ status: "success" });
}

async function fallbackUpdateUserBalance(userId: string, amount: number, nowIso: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/users/${encodeURIComponent(userId)}?key=${FIRESTORE_API_KEY}`;
    const res = await fetch(url).catch(() => null);
    if (res && res.ok) {
      const uData = await res.json().catch(() => ({}));
      const current = Number(uData?.fields?.balance?.integerValue || uData?.fields?.walletBalance?.integerValue || uData?.fields?.solde?.integerValue || 0);
      const next = current + Number(amount);
      const fields = {
        balance: { integerValue: String(next) },
        walletBalance: { integerValue: String(next) },
        solde: { integerValue: String(next) },
        lastPaymentAt: { timestampValue: nowIso },
        lastPaymentProvider: { stringValue: 'Money Fusion' },
        updatedAt: { timestampValue: nowIso }
      };
      const masks = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      await fetch(`${url}&${masks}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    }
  } catch (err: any) {
    console.warn('[Fallback REST wallet] warn:', err?.message);
  }
}

async function fallbackUnlockDoc(docId: string, nowIso: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/user_documents/${encodeURIComponent(docId)}?key=${FIRESTORE_API_KEY}`;
    const fields = {
      isUnlocked: { booleanValue: true },
      status: { stringValue: 'UNLOCKED' },
      paymentGateway: { stringValue: 'Money Fusion' },
      isPaid: { booleanValue: true },
      unlocked: { booleanValue: true },
      paidAt: { timestampValue: nowIso },
      updatedAt: { timestampValue: nowIso }
    };
    const masks = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    await fetch(`${url}&${masks}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  } catch (err: any) {
    console.warn('[Fallback REST doc] warn:', err?.message);
  }
}

async function fallbackActivateSubscription(userId: string, planId: string, expiresDate: string, nowIso: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/users/${encodeURIComponent(userId)}?key=${FIRESTORE_API_KEY}`;
    const fields = {
      isVip: { booleanValue: true },
      subscriptionStatus: { stringValue: 'ACTIVE' },
      plan: { stringValue: planId },
      lastPaymentAt: { timestampValue: nowIso },
      lastPaymentProvider: { stringValue: 'Money Fusion' },
      updatedAt: { timestampValue: nowIso }
    };
    const masks = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    await fetch(`${url}&${masks}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  } catch (err: any) {
    console.warn('[Fallback REST sub] warn:', err?.message);
  }
}
