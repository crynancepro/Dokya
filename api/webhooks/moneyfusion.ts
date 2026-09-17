import { db } from '../../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

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

    // TRAITEMENT 1 : RECHARGEMENT DU SOLDE (WALLET)
    if (type === 'wallet' || (!docId && !plan && amount > 0)) {
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        walletBalance: FieldValue.increment(amount),
        balance: FieldValue.increment(amount),
        solde: FieldValue.increment(amount),
        updatedAt: new Date()
      }, { merge: true });
      console.log(`Solde de l'utilisateur ${userId} crédité de ${amount} FCFA`);
    }

    // TRAITEMENT 2 : DÉBLOCAGE DE DOCUMENT
    if (docId) {
      const docRef = db.collection('user_documents').doc(docId);
      await docRef.set({
        isUnlocked: true,
        status: "UNLOCKED",
        paymentGateway: "Money Fusion",
        unlocked: true,
        isPaid: true,
        unlockedAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      console.log(`Document ${docId} débloqué avec succès`);

      if (userId && userId !== 'guest') {
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
          purchasedDocIds: FieldValue.arrayUnion(docId),
          updatedAt: new Date()
        }, { merge: true });
      }
    }

    // TRAITEMENT 3 : ABONNEMENT VIP
    if (type === 'subscription' || plan) {
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        isVip: true,
        subscriptionStatus: "ACTIVE",
        plan: plan || "PASS_VIP",
        vipActivatedAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      console.log(`Abonnement VIP activé pour l'utilisateur ${userId}`);
    }

    // Enregistrement de la transaction globale
    await db.collection('transactions').add({
      userId,
      amount,
      type: docId ? 'DOCUMENT' : (type === 'subscription' ? 'SUBSCRIPTION' : 'WALLET'),
      gateway: 'Money Fusion',
      paymentGateway: 'Money Fusion',
      status: 'COMPLETED',
      docId: docId || null,
      plan: plan || null,
      createdAt: new Date()
    });

    return res.status(200).json({ status: "success" });

  } catch (error: any) {
    console.error("Erreur Webhook Money Fusion :", error);
    return res.status(500).json({ error: error?.message || 'Erreur serveur' });
  }
}
