import { db } from '../../src/lib/firebase';
import { doc, updateDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const body = req.body || {};
    console.log("PAYLOAD MONEY FUSION REÇU :", JSON.stringify(body));

    const personalInfo = Array.isArray(body.personal_Info) ? (body.personal_Info[0] || {}) : (body.personal_Info || {});
    const metadata = body.metadata || body.customData || {};

    const userId = personalInfo.userId || body.userId || metadata.userId;
    const docId = personalInfo.docId || body.docId || metadata.docId;
    const type = personalInfo.type || body.type || metadata.type;
    const plan = personalInfo.plan || body.plan || personalInfo.planId || body.planId || metadata.plan || metadata.planId;
    const amount = Number(body.totalPrice || body.amount || personalInfo.amount || metadata.amount || 0);

    if (!userId) {
      console.error("Erreur: userId introuvable dans le payload");
      return res.status(400).json({ error: "userId manquant" });
    }

    const now = new Date().toISOString();

    // TRAITEMENT 1 : RECHARGEMENT DU SOLDE (WALLET)
    if (type === 'wallet' || (!docId && !plan && amount > 0)) {
      const userRef = doc(db, 'users', userId);
      try {
        await updateDoc(userRef, {
          walletBalance: increment(amount),
          balance: increment(amount),
          solde: increment(amount),
          lastPaymentAt: now,
          updatedAt: now
        });
      } catch (_e) {
        await setDoc(userRef, {
          walletBalance: increment(amount),
          balance: increment(amount),
          solde: increment(amount),
          lastPaymentAt: now,
          updatedAt: now
        }, { merge: true });
      }
      console.log(`Solde de l'utilisateur ${userId} crédité de ${amount} FCFA`);
    }

    // TRAITEMENT 2 : DÉBLOCAGE DE DOCUMENT
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
      } catch (_e) {
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
      console.log(`Document ${docId} débloqué avec succès`);

      if (userId && userId !== 'guest') {
        const userRef = doc(db, 'users', userId);
        try {
          await updateDoc(userRef, {
            purchasedDocIds: arrayUnion(docId),
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

    // TRAITEMENT 3 : ABONNEMENT VIP
    if (type === 'subscription' || plan) {
      const userRef = doc(db, 'users', userId);
      const chosenPlan = plan || 'VIP';
      try {
        await updateDoc(userRef, {
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: chosenPlan,
          vipActivatedAt: now,
          updatedAt: now
        });
      } catch (_e) {
        await setDoc(userRef, {
          isVip: true,
          subscriptionStatus: "ACTIVE",
          plan: chosenPlan,
          vipActivatedAt: now,
          updatedAt: now
        }, { merge: true });
      }
      console.log(`Abonnement VIP activé pour ${userId} (${chosenPlan})`);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Erreur Webhook:", error);
    return res.status(500).json({ error: error?.message || 'Erreur serveur webhook' });
  }
}
