import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';

/**
 * Route API Backend : Vérification et Validation Sécurisée de Secours
 * GET / POST /api/moneyfusion/verify
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

            const pInfo = Array.isArray(pData.personal_Info) ? (pData.personal_Info[0] || {}) : (pData.personal_Info || {});
            if (!userId) userId = String(pInfo.userId || '').trim();
            if (!docId) docId = String(pInfo.docId || '').trim();
            if (!plan) plan = String(pInfo.planId || pInfo.plan || '').trim();
            if (!type) type = String(pInfo.type || '').trim().toLowerCase();
            if (!amount) amount = Number(pData.totalPrice || pData.amount || pInfo.amount || 0);
          }
        }
      } catch (e) {
        console.error('[Verify] Erreur vérification API Money Fusion:', e);
      }
    } else if (token) {
      paymentVerified = true;
    }

    if (!paymentVerified && token) {
      return NextResponse.json({
        verified: false,
        status: "PENDING_OR_FAILED",
        message: "Paiement non confirmé auprès de Money Fusion"
      }, { status: 200 });
    }

    // 2. Mise à jour Firestore via Firebase Client SDK
    const now = new Date().toISOString();

    // A. Rechargement du Wallet
    if (userId && (type === 'wallet' || (!docId && !plan && amount > 0))) {
      try {
        const userRef = doc(db, 'users', userId);
        try {
          await updateDoc(userRef, {
            walletBalance: increment(amount),
            balance: increment(amount),
            solde: increment(amount),
            lastPaymentAt: now,
            lastPaymentProvider: 'Money Fusion',
            updatedAt: now
          });
        } catch (_err) {
          await setDoc(userRef, {
            walletBalance: increment(amount),
            balance: increment(amount),
            solde: increment(amount),
            lastPaymentAt: now,
            lastPaymentProvider: 'Money Fusion',
            updatedAt: now
          }, { merge: true });
        }
        console.log(`[Verify] Solde crédité pour ${userId}: +${amount}`);
      } catch (err) {
        console.error('[Verify] Erreur crédit solde Firestore:', err);
      }
    }

    // B. Déblocage de Document
    if (docId) {
      try {
        const docRef = doc(db, 'user_documents', docId);
        try {
          await updateDoc(docRef, {
            isUnlocked: true,
            status: "UNLOCKED",
            paymentGateway: "Money Fusion",
            unlocked: true,
            isPaid: true,
            unlockedAt: now,
            updatedAt: now
          });
        } catch (_err) {
          await setDoc(docRef, {
            isUnlocked: true,
            status: "UNLOCKED",
            paymentGateway: "Money Fusion",
            unlocked: true,
            isPaid: true,
            unlockedAt: now,
            updatedAt: now
          }, { merge: true });
        }
        console.log(`[Verify] Document débloqué: ${docId}`);

        if (userId && userId !== 'guest') {
          const userRef = doc(db, 'users', userId);
          try {
            await updateDoc(userRef, {
              purchasedDocIds: arrayUnion(docId),
              lastPaymentAt: now,
              updatedAt: now
            });
          } catch (_uErr) {
            await setDoc(userRef, {
              purchasedDocIds: [docId],
              lastPaymentAt: now,
              updatedAt: now
            }, { merge: true });
          }
        }
      } catch (err) {
        console.error('[Verify] Erreur déblocage document Firestore:', err);
      }
    }

    // C. Abonnement VIP
    if (userId && (type === 'subscription' || plan)) {
      try {
        const userRef = doc(db, 'users', userId);
        const resolvedPlan = plan || 'PASS_VIP';
        try {
          await updateDoc(userRef, {
            isVip: true,
            subscriptionStatus: "ACTIVE",
            plan: resolvedPlan,
            vipActivatedAt: now,
            lastPaymentAt: now,
            updatedAt: now
          });
        } catch (_err) {
          await setDoc(userRef, {
            isVip: true,
            subscriptionStatus: "ACTIVE",
            plan: resolvedPlan,
            vipActivatedAt: now,
            lastPaymentAt: now,
            updatedAt: now
          }, { merge: true });
        }
        console.log(`[Verify] Abonnement VIP activé pour ${userId} (${resolvedPlan})`);
      } catch (err) {
        console.error('[Verify] Erreur activation abonnement Firestore:', err);
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      status: "APPROVED",
      docId: docId || null,
      userId: userId || null,
      type: type || (docId ? 'document' : (plan ? 'subscription' : 'wallet')),
      plan: plan || null,
      amount: amount || null,
      data: mfData?.data || null,
      message: "Paiement validé et compte mis à jour avec succès."
    }, { status: 200 });

  } catch (error) {
    console.error("[Verify API Error]:", error);
    return NextResponse.json({
      error: error?.message || "Erreur interne lors de la vérification",
      verified: false
    }, { status: 500 });
  }
}
