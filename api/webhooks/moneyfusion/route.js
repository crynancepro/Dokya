import { NextResponse } from 'next/server.js';
import { dbAdmin, FieldValue } from '../../../lib/firebaseAdmin.js';

/**
 * Webhook Money Fusion avec Firebase Admin SDK
 * POST /api/webhooks/moneyfusion
 */
export async function POST(req) {
  try {
    const body = await req.json();
    console.log("=== PAYLOAD WEBHOOK MONEY FUSION REÇU ===", JSON.stringify(body));

    const personalInfo = Array.isArray(body.personal_Info)
      ? (body.personal_Info[0] || {})
      : (body.personal_Info || {});
    const metadata = body.metadata || body.customData || {};
    
    const userId = personalInfo.userId || body.userId || metadata.userId;
    const docId = personalInfo.docId || body.docId || metadata.docId;
    const type = personalInfo.type || body.type || metadata.type;
    const plan = personalInfo.plan || body.plan || personalInfo.planId || body.planId || metadata.plan || metadata.planId;
    const amount = Number(body.totalPrice || body.amount || personalInfo.amount || metadata.amount || 0);

    if (!userId) {
      console.error("[Webhook Error]: userId introuvable");
      return NextResponse.json({ error: "userId introuvable" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // A. Rechargement du solde
    if (type === 'wallet' || (!docId && !plan && amount > 0)) {
      try {
        await dbAdmin.collection('users').doc(userId).update({
          walletBalance: FieldValue.increment(amount),
          solde: FieldValue.increment(amount),
          balance: FieldValue.increment(amount),
          lastPaymentAt: now,
          updatedAt: now
        });
      } catch (_err) {
        await dbAdmin.collection('users').doc(userId).set({
          walletBalance: FieldValue.increment(amount),
          solde: FieldValue.increment(amount),
          balance: FieldValue.increment(amount),
          lastPaymentAt: now,
          updatedAt: now
        }, { merge: true });
      }
      console.log(`[Webhook Admin] Solde rechargé pour l'utilisateur ${userId} : +${amount} FCFA`);
    }

    // B. Déblocage de document
    if (docId) {
      try {
        await dbAdmin.collection('user_documents').doc(docId).update({
          isUnlocked: true,
          status: "UNLOCKED",
          paymentGateway: "Money Fusion",
          unlocked: true,
          isPaid: true,
          unlockedAt: now,
          updatedAt: now
        });
      } catch (_err) {
        await dbAdmin.collection('user_documents').doc(docId).set({
          isUnlocked: true,
          status: "UNLOCKED",
          paymentGateway: "Money Fusion",
          unlocked: true,
          isPaid: true,
          unlockedAt: now,
          updatedAt: now
        }, { merge: true });
      }
      console.log(`[Webhook Admin] Document ${docId} débloqué avec succès`);

      if (userId && userId !== 'guest') {
        try {
          await dbAdmin.collection('users').doc(userId).update({
            purchasedDocIds: FieldValue.arrayUnion(docId),
            updatedAt: now
          });
        } catch (_uErr) {
          await dbAdmin.collection('users').doc(userId).set({
            purchasedDocIds: [docId],
            updatedAt: now
          }, { merge: true });
        }
      }
    }

    // C. Activation d'abonnement
    if (type === 'subscription' || plan) {
      const chosenPlan = plan || "VIP";
      try {
        await dbAdmin.collection('users').doc(userId).update({
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: chosenPlan,
          vipActivatedAt: now,
          updatedAt: now
        });
      } catch (_err) {
        await dbAdmin.collection('users').doc(userId).set({
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: chosenPlan,
          vipActivatedAt: now,
          updatedAt: now
        }, { merge: true });
      }
      console.log(`[Webhook Admin] Abonnement VIP activé pour ${userId} (plan: ${chosenPlan})`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur Webhook:", error);
    return NextResponse.json({ error: error?.message || 'Erreur interne webhook' }, { status: 500 });
  }
}
