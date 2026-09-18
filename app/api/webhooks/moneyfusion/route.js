import { NextResponse } from 'next/server.js';
import { db } from '../../../../lib/firebase.js';
import { doc, updateDoc, setDoc, increment } from 'firebase/firestore';

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("=== WEBHOOK MONEY FUSION REÇU ===", JSON.stringify(body));

    const personalInfo = Array.isArray(body.personal_Info)
      ? (body.personal_Info[0] || {})
      : (body.personal_Info || {});
    
    const userId = personalInfo.userId || body.userId;
    const docId = personalInfo.docId || body.docId;
    const type = personalInfo.type || body.type;
    const plan = personalInfo.plan || body.plan;
    const amount = Number(body.totalPrice || body.amount || 0);

    if (!userId) {
      return NextResponse.json({ error: "userId introuvable" }, { status: 400 });
    }

    // A. Rechargement du solde
    if (type === 'wallet' || (!docId && !plan && amount > 0)) {
      const userRef = doc(db, 'users', userId);
      try {
        await updateDoc(userRef, {
          walletBalance: increment(amount),
          solde: increment(amount)
        });
      } catch (_e) {
        await setDoc(userRef, {
          walletBalance: increment(amount),
          solde: increment(amount)
        }, { merge: true });
      }
      console.log(`[Webhook] Solde de l'utilisateur ${userId} crédité de ${amount} FCFA`);
    }

    // B. Déblocage de document
    if (docId) {
      const docRef = doc(db, 'user_documents', docId);
      try {
        await updateDoc(docRef, {
          isUnlocked: true,
          status: "UNLOCKED"
        });
      } catch (_e) {
        await setDoc(docRef, {
          isUnlocked: true,
          status: "UNLOCKED"
        }, { merge: true });
      }
      console.log(`[Webhook] Document ${docId} débloqué`);
    }

    // C. Activation d'abonnement
    if (type === 'subscription' || plan) {
      const userRef = doc(db, 'users', userId);
      try {
        await updateDoc(userRef, {
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: plan || "VIP"
        });
      } catch (_e) {
        await setDoc(userRef, {
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: plan || "VIP"
        }, { merge: true });
      }
      console.log(`[Webhook] Abonnement VIP activé pour ${userId} (plan: ${plan || 'VIP'})`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erreur Webhook:", error);
    return NextResponse.json({ error: error?.message || 'Erreur interne webhook' }, { status: 500 });
  }
}
