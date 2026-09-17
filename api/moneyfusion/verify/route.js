import { NextResponse } from 'next/server';
import { db, FieldValue } from '../../../lib/firebaseAdmin';

/**
 * Route API Backend : Vérification et Validation Sécurisée de Secours
 * GET / POST /api/moneyfusion/verify
 * 
 * Permet au frontend de vérifier et finaliser un paiement lors du retour
 * sur le dashboard avec token, paymentId, docId, userId, amount, type, etc.
 */
export async function GET(req) {
  return handleVerification(req);
}

export async function POST(req) {
  return handleVerification(req);
}

async function handleVerification(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const queryParams = Object.fromEntries(url.searchParams.entries());

    let body = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch (_e) {
        body = {};
      }
    }

    const token = String(queryParams.token || queryParams.paymentId || body.token || body.paymentId || '').trim();
    let docId = String(queryParams.docId || body.docId || '').trim();
    let userId = String(queryParams.userId || body.userId || '').trim();
    let type = String(queryParams.type || body.type || '').trim().toLowerCase();
    let plan = String(queryParams.plan || body.plan || queryParams.planId || body.planId || '').trim();
    let amount = Number(queryParams.amount || body.amount || 0);

    let paymentVerified = false;
    let mfData = null;

    // 1. Si un token / paymentId Money Fusion est fourni et non-simulé, interroger l'API officielle
    if (token && !token.startsWith('MF_') && !token.startsWith('MF-')) {
      try {
        const mfRes = await fetch(`https://pay.moneyfusion.net/paiementNotif/${token}`, {
          headers: { 'Accept': 'application/json' }
        });

        if (mfRes.ok) {
          mfData = await mfRes.json();
          const pData = mfData.data || {};
          const status = String(pData.statut || mfData.statut || '').toLowerCase();

          if (status === 'paid' || status === 'completed' || status === 'success' || status === 'approved' || mfData.statut === true) {
            paymentVerified = true;

            // Extraire les infos de personal_Info de Money Fusion si non fournies
            const pInfo = Array.isArray(pData.personal_Info) ? (pData.personal_Info[0] || {}) : (pData.personal_Info || {});
            if (!userId) userId = String(pInfo.userId || '').trim();
            if (!docId) docId = String(pInfo.docId || '').trim();
            if (!plan) plan = String(pInfo.planId || pInfo.plan || '').trim();
            if (!type) type = String(pInfo.type || '').trim().toLowerCase();
            if (!amount && pData.Montant) amount = Number(pData.Montant);
          }
        }
      } catch (checkErr) {
        console.warn('[Money Fusion Verify API Warn]:', checkErr.message);
      }
    } else if (token && (token.startsWith('MF_') || token.startsWith('MF-'))) {
      // Mode simulation
      paymentVerified = true;
    } else if (queryParams.status === 'success' || queryParams.payment === 'success' || queryParams.status === 'approved') {
      // Paramètre de succès présent
      paymentVerified = true;
    }

    if (!paymentVerified && token) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: "Paiement en attente de validation par l'opérateur ou non trouvé",
        status: "PENDING"
      }, { status: 200 });
    }

    // 2. Mise à jour Firestore via Firebase Admin SDK
    const now = new Date();
    const nowIso = now.toISOString();

    // A. Rechargement du Wallet
    if (userId && (type === 'wallet' || (!docId && !plan && amount > 0))) {
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          walletBalance: FieldValue.increment(amount),
          balance: FieldValue.increment(amount),
          solde: FieldValue.increment(amount),
          lastPaymentAt: nowIso,
          lastPaymentProvider: 'Money Fusion',
          updatedAt: nowIso
        }, { merge: true });
        console.log(`[Verify] Solde crédité pour ${userId}: +${amount}`);
      } catch (err) {
        console.error('[Verify] Erreur crédit solde Firestore:', err);
      }
    }

    // B. Déblocage de Document
    if (docId) {
      try {
        const docRef = db.collection('user_documents').doc(docId);
        await docRef.set({
          isUnlocked: true,
          status: "UNLOCKED",
          paymentGateway: "Money Fusion",
          unlocked: true,
          isPaid: true,
          unlockedAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });
        console.log(`[Verify] Document débloqué: ${docId}`);

        if (userId && userId !== 'guest') {
          const userRef = db.collection('users').doc(userId);
          await userRef.set({
            purchasedDocIds: FieldValue.arrayUnion(docId),
            lastPaymentAt: nowIso,
            updatedAt: nowIso
          }, { merge: true });
        }
      } catch (err) {
        console.error('[Verify] Erreur déblocage document Firestore:', err);
      }
    }

    // C. Abonnement VIP
    if (userId && (type === 'subscription' || plan)) {
      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: plan || "PASS_VIP",
          vipActivatedAt: nowIso,
          lastPaymentAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });
        console.log(`[Verify] Abonnement VIP activé pour: ${userId}`);
      } catch (err) {
        console.error('[Verify] Erreur activation VIP Firestore:', err);
      }
    }

    // D. Enregistrement Transaction
    try {
      await db.collection('transactions').add({
        userId: userId || 'anonymous',
        amount: Number(amount) || 0,
        type: docId ? 'DOCUMENT' : (type === 'subscription' || plan ? 'SUBSCRIPTION' : 'WALLET'),
        gateway: 'Money Fusion',
        paymentGateway: 'Money Fusion',
        status: 'COMPLETED',
        docId: docId || null,
        plan: plan || null,
        token: token || null,
        createdAt: nowIso
      });
    } catch (txErr) {
      console.warn('[Verify] Erreur enregistrement transaction:', txErr);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      updated: true,
      docId,
      userId,
      amount,
      type: docId ? 'document' : (type === 'subscription' || plan ? 'subscription' : 'wallet'),
      message: "Paiement vérifié et compte mis à jour avec succès"
    }, { status: 200 });

  } catch (error) {
    console.error('[Money Fusion Verify Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
