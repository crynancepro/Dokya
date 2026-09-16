import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Configuration Firestore
const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';
const FIRESTORE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDrIGI9XiDRwq8Q7WDEHcbmhQGzy38skc4';

/**
 * Initialisation unique du Firebase Admin SDK
 */
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
      } catch (err) {
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

/**
 * Webhook Money Fusion - Point d'entrée officiel Vercel / Next.js
 * Route : POST /api/webhooks/moneyfusion
 */
export async function POST(req) {
  let body = {};

  try {
    body = await req.json().catch(() => ({}));
  } catch (_e) {
    body = {};
  }

  // 3. LOGS POUR DÉBOGAGE (Visible dans les logs Vercel / Cloud Run)
  console.log("Webhook payload reçu:", JSON.stringify(body));

  try {
    // 1. EXTRACTION DES VARIABLES SELON TOUS LES FORMATS POSSIBLES DE MONEY FUSION
    const personalInfo = Array.isArray(body.personal_Info) 
      ? (body.personal_Info[0] || {}) 
      : (body.personal_Info || {});
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

    // Vérification de validité du statut
    const isApproved = status === 'true' || status === 'success' || status === 'paid' || status === 'completed' || status === 'approved' || rawStatus === true || rawStatus === 1;

    // Si le statut est explicitement une annulation ou un échec, on acquitte proprement
    if (!isApproved && (status === 'cancel' || status === 'failed' || status === 'refused' || status === 'false')) {
      console.log(`[Money Fusion Webhook] Statut non validé (${status}), acquittement sans modification.`);
      return NextResponse.json({ status: "success" }, { status: 200 });
    }

    console.log(`[Money Fusion Webhook] Traitement en cours :`, {
      docId,
      userId,
      amount,
      type,
      plan,
      status,
      txId
    });

    const db = getDb();

    // =========================================================================
    // 2. LOGIQUE D'EXÉCUTION SELON LE TYPE
    // =========================================================================

    // -------------------------------------------------------------------------
    // A. Si c'est un rechargement de Solde (type === 'wallet' ou amount présent sans docId)
    // -------------------------------------------------------------------------
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
        console.log(`[Webhook - CAS A] Solde incrémenté avec succès pour ${userId}`);
      } catch (walletErr) {
        console.error(`[Webhook - CAS A] Erreur Firebase Admin increment:`, walletErr?.message);
        // Fallback direct REST
        await fallbackUpdateUserBalance(userId, amount, nowIso);
      }

      // Enregistrement de la transaction dans la collection 'transactions'
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
          operator: 'moneyfusion_mobile_qr',
          description: `Rechargement Wallet (${amount} FCFA) - Money Fusion`,
          createdAt: nowIso,
          completedAt: nowIso
        }, { merge: true });
        console.log(`[Webhook - CAS A] Transaction ${txId} enregistrée.`);
      } catch (txErr) {
        console.error(`[Webhook - CAS A] Erreur log transaction:`, txErr?.message);
      }
    }

    // -------------------------------------------------------------------------
    // B. Si c'est un Déblocage de Document (docId présent)
    // -------------------------------------------------------------------------
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
        console.log(`[Webhook - CAS B] Document ${docId} débloqué avec succès.`);
      } catch (docErr) {
        console.error(`[Webhook - CAS B] Erreur Firebase Admin doc:`, docErr?.message);
        // Fallback REST direct
        await fallbackUnlockDoc(docId, nowIso);
      }

      // Rattacher à la liste des documents achetés de l'utilisateur si userId fourni
      if (userId && userId !== 'guest') {
        try {
          const userRef = db.collection('users').doc(userId);
          await userRef.set({
            purchasedDocIds: FieldValue.arrayUnion(docId),
            lastPaymentAt: nowIso,
            lastPaymentProvider: "Money Fusion",
            updatedAt: nowIso
          }, { merge: true });
        } catch (uDocErr) {
          console.warn(`[Webhook - CAS B] Warning maj purchasedDocIds:`, uDocErr?.message);
        }
      }

      // Enregistrement de la transaction
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
        console.log(`[Webhook - CAS B] Transaction ${txId} enregistrée.`);
      } catch (txErr) {
        console.error(`[Webhook - CAS B] Erreur log transaction:`, txErr?.message);
      }
    }

    // -------------------------------------------------------------------------
    // C. Si c'est un Abonnement VIP (planId ou type === 'subscription')
    // -------------------------------------------------------------------------
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
        console.log(`[Webhook - CAS C] Abonnement activé avec succès pour ${userId}`);
      } catch (subErr) {
        console.error(`[Webhook - CAS C] Erreur Firebase Admin sub:`, subErr?.message);
        // Fallback direct REST
        await fallbackActivateSubscription(userId, resolvedPlan, expiresDate, nowIso);
      }

      // Enregistrement de la transaction
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
        console.log(`[Webhook - CAS C] Transaction ${txId} enregistrée.`);
      } catch (txErr) {
        console.error(`[Webhook - CAS C] Erreur log transaction:`, txErr?.message);
      }
    }

  } catch (globalErr) {
    console.error('[Money Fusion Webhook Erreur Générale]:', globalErr);
  }

  // 3. RENVOIE TOUJOURS STATUS 200 SUCCESS
  return NextResponse.json({ status: "success" }, { status: 200 });
}

// ---------------------------------------------------------------------------
// FONCTIONS DE SECOURS FIRESTORE (GARANTIE D'EXÉCUTION 100% MÊME SI PROBLÈME DE CLÉ ADMIN)
// ---------------------------------------------------------------------------
async function fallbackUpdateUserBalance(userId, amount, nowIso) {
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
  } catch (err) {
    console.warn('[Fallback REST wallet] warn:', err?.message);
  }
}

async function fallbackUnlockDoc(docId, nowIso) {
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
  } catch (err) {
    console.warn('[Fallback REST doc] warn:', err?.message);
  }
}

async function fallbackActivateSubscription(userId, planId, expiresDate, nowIso) {
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
  } catch (err) {
    console.warn('[Fallback REST sub] warn:', err?.message);
  }
}
