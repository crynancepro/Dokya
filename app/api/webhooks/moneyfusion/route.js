import { NextResponse } from 'next/server';

// Configuration Firestore REST API
const FIRESTORE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0865957742';
const FIRESTORE_DATABASE_ID = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-gnrateurdecvlett-49cc73ad-7657-4218-be85-c050974ca976';
const FIRESTORE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDrIGI9XiDRwq8Q7WDEHcbmhQGzy38skc4';

/**
 * Traitement automatisé des notifications Webhook Money Fusion
 * POST /api/webhooks/moneyfusion
 * 
 * 3 Cas d'usage gérés automatiquement :
 * A. Déblocage de Document (docId présent)
 * B. Activation / Renouvellement d'Abonnement (planId / userEmail / userId)
 * C. Rechargement du Wallet / Solde Dokya (amount / userId)
 */
export async function POST(req) {
  try {
    const payload = await req.json().catch(() => ({}));
    console.log('[Money Fusion Webhook] Notification reçue:', payload);

    // Vérification du statut de succès du paiement
    const statusVal = String(payload.statut ?? payload.status ?? payload.event ?? '').toLowerCase();
    const isSuccess = statusVal === 'true' || statusVal === 'success' || statusVal === 'paid' || statusVal === 'completed' || statusVal === 'approved' || payload.statut === true;

    // Si le statut est explicitement un échec ou en attente, acquitter sans traitement
    if (!isSuccess && statusVal !== '') {
      console.log('[Money Fusion Webhook] Paiement non approuvé, ignoré:', statusVal);
      return NextResponse.json({ received: true, ignored: true, status: statusVal });
    }

    // Extraction flexible des métadonnées
    const personalInfo = Array.isArray(payload.personal_Info) ? payload.personal_Info[0] : (payload.personal_Info || {});
    const metadata = payload.metadata || payload.customData || {};

    const docId = String(personalInfo.docId || metadata.docId || payload.docId || '').trim();
    const userId = String(personalInfo.userId || metadata.userId || payload.userId || '').trim();
    const planId = String(personalInfo.planId || metadata.planId || payload.planId || '').trim();
    const userEmail = String(personalInfo.email || metadata.userEmail || payload.clientEmail || payload.email || '').trim();
    const amount = Number(payload.totalPrice || payload.amount || personalInfo.amount || 3000);
    const txId = payload.token || payload.orderId || payload.id || `MF-${Date.now()}`;
    const now = new Date();

    const isDocumentUnlock = Boolean(docId);
    const isSubscription = Boolean(planId) || (!isDocumentUnlock && (amount === 3499 || amount === 39999 || amount === 5000 || planId === 'PASS_VIP' || planId === 'monthly' || planId === 'annual' || planId === 'weekly'));
    const isWalletRecharge = !isDocumentUnlock && !isSubscription && Boolean(userId);

    const transactionType = isDocumentUnlock ? 'DOCUMENT_UNLOCK' : (isSubscription ? 'SUBSCRIPTION_PURCHASE' : 'WALLET_RECHARGE');
    const transactionTypeLabel = isDocumentUnlock ? 'Document' : (isSubscription ? 'Abonnement VIP' : 'Rechargement Wallet');

    console.log('[Money Fusion Webhook] Traitement du cas:', {
      type: transactionType,
      docId,
      userId,
      planId,
      amount,
      txId
    });

    // --- CAS A : Déblocage de Document (docId présent) ---
    if (isDocumentUnlock) {
      // 1. Mettre à jour le statut du document dans Firestore: { isUnlocked: true, status: "UNLOCKED", paymentGateway: "Money Fusion" }
      const docUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/user_documents/${encodeURIComponent(docId)}?key=${FIRESTORE_API_KEY}`;
      const docFields = {
        isUnlocked: { booleanValue: true },
        status: { stringValue: 'UNLOCKED' },
        paymentGateway: { stringValue: 'Money Fusion' },
        unlocked: { booleanValue: true },
        isPaid: { booleanValue: true },
        paidAt: { timestampValue: now.toISOString() },
        updatedAt: { timestampValue: now.toISOString() }
      };

      const docMasks = Object.keys(docFields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      await fetch(`${docUrl}&${docMasks}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: docFields })
      }).catch(err => console.error('[Money Fusion Webhook] Erreur mise à jour doc:', err));

      // 2. Associer le document débloqué au compte utilisateur si userId fourni
      if (userId && userId !== 'guest') {
        const userUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/users/${encodeURIComponent(userId)}?key=${FIRESTORE_API_KEY}`;
        const getRes = await fetch(userUrl).catch(() => null);
        let existingPurchased = [];
        if (getRes && getRes.ok) {
          const uData = await getRes.json().catch(() => ({}));
          const existingList = uData?.fields?.purchasedDocIds?.arrayValue?.values || [];
          existingPurchased = existingList.map(v => v.stringValue).filter(Boolean);
        }

        if (!existingPurchased.includes(docId)) {
          existingPurchased.push(docId);
        }

        const userFields = {
          purchasedDocIds: {
            arrayValue: {
              values: existingPurchased.map(id => ({ stringValue: id }))
            }
          },
          lastPaymentAt: { timestampValue: now.toISOString() },
          lastPaymentProvider: { stringValue: 'Money Fusion' },
          updatedAt: { timestampValue: now.toISOString() }
        };
        const uMasks = Object.keys(userFields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
        await fetch(`${userUrl}&${uMasks}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: userFields })
        }).catch(err => console.error('[Money Fusion Webhook] Erreur mise à jour user:', err));
      }
    }

    // --- CAS B : Activation / Renouvellement d'Abonnement ---
    if (isSubscription && userId && userId !== 'guest') {
      const resolvedPlan = planId || 'PASS_VIP';
      const durationDays = resolvedPlan === 'annual' || amount >= 15000 ? 365 : (resolvedPlan === 'weekly' ? 7 : 30);
      const expiresDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const userUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/users/${encodeURIComponent(userId)}?key=${FIRESTORE_API_KEY}`;
      const userFields = {
        isVip: { booleanValue: true },
        subscriptionStatus: { stringValue: 'ACTIVE' },
        plan: { stringValue: resolvedPlan },
        updatedAt: { timestampValue: now.toISOString() },
        lastPaymentAt: { timestampValue: now.toISOString() },
        lastPaymentProvider: { stringValue: 'Money Fusion' },
        subscription: {
          mapValue: {
            fields: {
              planId: { stringValue: resolvedPlan },
              status: { stringValue: 'ACTIVE' },
              activatedAt: { timestampValue: now.toISOString() },
              expiresAt: { timestampValue: expiresDate.toISOString() },
              pricePaid: { integerValue: String(amount) },
              paymentMethod: { stringValue: 'Money Fusion' },
              paymentGateway: { stringValue: 'Money Fusion' }
            }
          }
        }
      };

      const uMasks = Object.keys(userFields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      await fetch(`${userUrl}&${uMasks}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: userFields })
      }).catch(err => console.error('[Money Fusion Webhook] Erreur mise à jour abonnement user:', err));
    }

    // --- CAS C : Rechargement du Wallet / Solde Dokya ---
    if (isWalletRecharge && userId && userId !== 'guest') {
      const userUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/users/${encodeURIComponent(userId)}?key=${FIRESTORE_API_KEY}`;
      const getRes = await fetch(userUrl).catch(() => null);
      let currentBalance = 0;
      if (getRes && getRes.ok) {
        const uData = await getRes.json().catch(() => ({}));
        currentBalance = Number(uData?.fields?.balance?.integerValue || uData?.fields?.walletBalance?.integerValue || uData?.fields?.solde?.integerValue || 0);
      }

      const newBalance = currentBalance + amount;
      const userFields = {
        balance: { integerValue: String(newBalance) },
        walletBalance: { integerValue: String(newBalance) },
        solde: { integerValue: String(newBalance) },
        lastPaymentAt: { timestampValue: now.toISOString() },
        lastPaymentProvider: { stringValue: 'Money Fusion' },
        updatedAt: { timestampValue: now.toISOString() }
      };

      const uMasks = Object.keys(userFields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      await fetch(`${userUrl}&${uMasks}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: userFields })
      }).catch(err => console.error('[Money Fusion Webhook] Erreur crédit solde user:', err));
    }

    // --- Enregistrement de la transaction dans Firestore ---
    const txUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/transactions?documentId=${encodeURIComponent(txId)}&key=${FIRESTORE_API_KEY}`;
    const txFields = {
      id: { stringValue: txId },
      transactionId: { stringValue: txId },
      userId: { stringValue: userId || 'anonymous' },
      userEmail: { stringValue: userEmail },
      userName: { stringValue: personalInfo.nom || metadata.userName || 'Client Dokya' },
      userPhone: { stringValue: payload.numeroSend || personalInfo.telephone || '' },
      amount: { integerValue: String(amount) },
      currency: { stringValue: payload.currency || 'XOF' },
      type: { stringValue: transactionType },
      typeLabel: { stringValue: transactionTypeLabel },
      status: { stringValue: 'COMPLETED' },
      paymentGateway: { stringValue: 'Money Fusion' },
      paymentMethod: { stringValue: 'moneyfusion' },
      operator: { stringValue: 'moneyfusion_mobile_qr' },
      targetDocId: { stringValue: docId },
      planId: { stringValue: planId || (isSubscription ? 'PASS_VIP' : '') },
      description: { stringValue: isDocumentUnlock ? `Déblocage Document (${docId}) - Money Fusion` : (isSubscription ? `Abonnement VIP (${planId || 'Pass'}) - Money Fusion` : `Rechargement Wallet (${amount} XOF) - Money Fusion`) },
      createdAt: { timestampValue: now.toISOString() },
      completedAt: { timestampValue: now.toISOString() }
    };

    await fetch(txUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: txFields })
    }).catch(err => console.error('[Money Fusion Webhook] Erreur log transaction:', err));

    return NextResponse.json({
      received: true,
      status: 'PROCESSED',
      type: transactionType,
      docId: docId || null,
      userId: userId || null,
      amount
    });
  } catch (error) {
    console.error('[Money Fusion Webhook Fatal Error]:', error);
    return NextResponse.json({ error: error.message || 'Erreur interne webhook Money Fusion' }, { status: 500 });
  }
}
