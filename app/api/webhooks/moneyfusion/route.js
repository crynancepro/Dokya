import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Webhook Money Fusion
 * POST /api/webhooks/moneyfusion
 * 
 * Conforme à la documentation officielle Money Fusion
 */
export async function POST(req) {
  try {
    const rawText = await req.text();
    console.log("=== PAYLOAD WEBHOOK MONEY FUSION REÇU ===", rawText);

    let body = {};
    try {
      body = JSON.parse(rawText);
    } catch (_e) {
      console.warn("Payload non-JSON ou vide");
    }

    // 1. Extraction des données selon la documentation officielle Money Fusion
    const { personal_Info, totalPrice, statut } = body;
    const info = Array.isArray(personal_Info) ? (personal_Info[0] || {}) : (personal_Info || {});

    const amount = Number(totalPrice || body.amount || info.amount || 0);
    const userId = String(info.userId || body.userId || '').trim();
    const docId = String(info.docId || body.docId || '').trim();
    const type = String(info.type || body.type || '').trim().toLowerCase();
    const plan = String(info.plan || info.planId || body.plan || body.planId || '').trim();

    // 2. Vérification de la validité du paiement (statut === true ou "PAID" / "SUCCESS")
    const rawStatus = String(statut ?? body.status ?? '').toUpperCase();
    const isSuccess =
      statut === true ||
      rawStatus === 'TRUE' ||
      rawStatus === 'PAID' ||
      rawStatus === 'SUCCESS' ||
      rawStatus === 'SUCCES' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'APPROVED' ||
      body.statut === true ||
      body.status === 200 ||
      body.status === '200';

    console.log(`[Money Fusion Webhook] Validation: isSuccess=${isSuccess}, statut=${statut}, userId=${userId}, docId=${docId}, type=${type}, totalPrice=${totalPrice}`);

    if (!isSuccess) {
      console.warn(`[Money Fusion Webhook] Statut de paiement non validé: ${statut}`);
      return NextResponse.json({ message: "Paiement en attente ou refusé", statut }, { status: 200 });
    }

    const now = new Date();

    // Cas 1 : Rechargement du Wallet (info.type === 'wallet' ou info.amount)
    if (userId && (type === 'wallet' || info.amount || (!docId && !plan && amount > 0))) {
      try {
        await db.collection('users').doc(userId).update({
          walletBalance: FieldValue.increment(Number(amount)),
          balance: FieldValue.increment(Number(amount)),
          solde: FieldValue.increment(Number(amount)),
          updatedAt: now
        });
        console.log(`✅ [Wallet] Solde de l'utilisateur ${userId} incrémenté de +${amount} FCFA`);
      } catch (err) {
        // Fallback si le document utilisateur n'existe pas encore
        await db.collection('users').doc(userId).set({
          walletBalance: FieldValue.increment(Number(amount)),
          balance: FieldValue.increment(Number(amount)),
          solde: FieldValue.increment(Number(amount)),
          updatedAt: now
        }, { merge: true });
        console.log(`✅ [Wallet] Solde créé/mis à jour pour ${userId} (+${amount} FCFA)`);
      }
    }

    // Cas 2 : Déblocage de Document (info.docId)
    if (docId) {
      try {
        await db.collection('user_documents').doc(docId).update({
          isUnlocked: true,
          status: "UNLOCKED",
          unlocked: true,
          isPaid: true,
          paymentGateway: "Money Fusion",
          unlockedAt: now,
          updatedAt: now
        });
        console.log(`✅ [Document] Document ${docId} débloqué avec succès (UNLOCKED)`);
      } catch (err) {
        await db.collection('user_documents').doc(docId).set({
          isUnlocked: true,
          status: "UNLOCKED",
          unlocked: true,
          isPaid: true,
          paymentGateway: "Money Fusion",
          unlockedAt: now,
          updatedAt: now
        }, { merge: true });
        console.log(`✅ [Document] Document ${docId} créé et débloqué (UNLOCKED)`);
      }

      if (userId && userId !== 'guest') {
        try {
          await db.collection('users').doc(userId).update({
            purchasedDocIds: FieldValue.arrayUnion(docId),
            updatedAt: now
          });
        } catch (_e) {
          await db.collection('users').doc(userId).set({
            purchasedDocIds: FieldValue.arrayUnion(docId),
            updatedAt: now
          }, { merge: true });
        }
      }
    }

    // Cas 3 : Abonnement VIP (info.type === 'subscription' ou info.plan)
    if (userId && (type === 'subscription' || plan)) {
      const activePlan = plan || "PASS_VIP";
      try {
        await db.collection('users').doc(userId).update({
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: activePlan,
          vipActivatedAt: now,
          updatedAt: now
        });
        console.log(`✅ [Subscription] Statut VIP activé pour ${userId} (Plan: ${activePlan})`);
      } catch (err) {
        await db.collection('users').doc(userId).set({
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: activePlan,
          vipActivatedAt: now,
          updatedAt: now
        }, { merge: true });
        console.log(`✅ [Subscription] Document utilisateur créé avec statut VIP pour ${userId}`);
      }
    }

    // Enregistrement historique dans la collection 'transactions'
    try {
      await db.collection('transactions').add({
        userId: userId || 'anonymous',
        amount,
        type: docId ? 'DOCUMENT' : (type === 'subscription' || plan ? 'SUBSCRIPTION' : 'WALLET'),
        gateway: 'Money Fusion',
        paymentGateway: 'Money Fusion',
        status: 'COMPLETED',
        docId: docId || null,
        plan: plan || null,
        token: body.token || null,
        createdAt: now
      });
    } catch (txErr) {
      console.warn("⚠️ Impossible d'enregistrer la transaction dans Firestore:", txErr.message);
    }

    return NextResponse.json({ status: "success", message: "Traitement webhook effectué avec succès" }, { status: 200 });

  } catch (error) {
    console.error("❌ Erreur Webhook Money Fusion :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
