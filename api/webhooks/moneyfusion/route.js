import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase.js';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';

/**
 * Webhook Money Fusion
 * POST /api/webhooks/moneyfusion
 */
export async function POST(req) {
  try {
    const body = await req.json();
    console.log("=== PAYLOAD WEBHOOK MONEY FUSION REÇU ===", JSON.stringify(body));

    const personalInfo = body.personal_Info?.[0] || body.personal_Info || {};
    
    const userId = personalInfo.userId || body.userId;
    const docId = personalInfo.docId || body.docId;
    const type = personalInfo.type || body.type;
    const plan = personalInfo.plan || body.plan;
    const amount = Number(body.totalPrice || body.amount || 0);

    if (!userId) {
      return NextResponse.json({ error: "userId introuvable" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // A. Rechargement Solde
    if (type === 'wallet' || (!docId && !plan && amount > 0)) {
      const userRef = doc(db, 'users', userId);
      try {
        await updateDoc(userRef, {
          walletBalance: increment(amount),
          solde: increment(amount),
          balance: increment(amount),
          lastPaymentAt: now,
          updatedAt: now
        });
      } catch (_err) {
        await setDoc(userRef, {
          walletBalance: increment(amount),
          solde: increment(amount),
          balance: increment(amount),
          lastPaymentAt: now,
          updatedAt: now
        }, { merge: true });
      }
      console.log(`[Webhook] Solde rechargé pour l'utilisateur ${userId} : +${amount} FCFA`);
    }

    // B. Déblocage Document
    if (docId) {
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
      console.log(`[Webhook] Document ${docId} débloqué avec succès`);

      // Enregistrer le document débloqué dans le profil utilisateur
      if (userId && userId !== 'guest') {
        const userRef = doc(db, 'users', userId);
        try {
          await updateDoc(userRef, {
            purchasedDocIds: [docId],
            updatedAt: now
          });
        } catch (_uErr) {
          await setDoc(userRef, {
            purchasedDocIds: [docId],
            updatedAt: now
          }, { merge: true });
        }
      }
    }

    // C. Activation Abonnement
    if (type === 'subscription' || plan) {
      const userRef = doc(db, 'users', userId);
      const chosenPlan = plan || "VIP";
      try {
        await updateDoc(userRef, {
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: chosenPlan,
          vipActivatedAt: now,
          updatedAt: now
        });
      } catch (_err) {
        await setDoc(userRef, {
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: chosenPlan,
          vipActivatedAt: now,
          updatedAt: now
        }, { merge: true });
      }
      console.log(`[Webhook] Abonnement VIP activé pour ${userId} (plan: ${chosenPlan})`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur Webhook:", error);
    return NextResponse.json({ error: error?.message || 'Erreur interne webhook' }, { status: 500 });
  }
}
