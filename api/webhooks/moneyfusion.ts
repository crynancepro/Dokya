import { db } from '../../lib/firebase.js';
import { doc, updateDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const body = req.body || {};
    console.log("PAYLOAD MONEY FUSION REÇU (handler) :", JSON.stringify(body));

    const personalInfo = Array.isArray(body.personal_Info) ? (body.personal_Info[0] || {}) : (body.personal_Info || {});
    const metadata = body.metadata || body.customData || {};

    const userId = personalInfo.userId || body.userId || metadata.userId;
    const docId = personalInfo.docId || body.docId || metadata.docId;
    const type = personalInfo.type || body.type || metadata.type;
    const plan = personalInfo.plan || body.plan || personalInfo.planId || body.planId || metadata.plan || metadata.planId;
    const amount = Number(body.totalPrice || body.amount || personalInfo.amount || metadata.amount || 0);

    if (!userId) {
      console.error("[Webhook Error]: userId introuvable");
      return res.status(400).json({ error: "userId introuvable" });
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
      console.log(`[Webhook] Solde de l'utilisateur ${userId} crédité de ${amount} FCFA`);
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
      console.log(`[Webhook] Document ${docId} débloqué pour l'utilisateur ${userId}`);

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
      const chosenPlan = plan || "VIP";
      const userRef = doc(db, 'users', userId);
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
      console.log(`[Webhook] Abonnement VIP (${chosenPlan}) activé pour l'utilisateur ${userId}`);
    }

    // ENREGISTREMENT DE LA TRANSACTION
    try {
      const txId = body.token || body.orderId || `MF_${Date.now()}`;
      const txRef = doc(db, 'transactions', txId);
      await setDoc(txRef, {
        transactionId: txId,
        userId,
        amount,
        type: type || (docId ? 'DOCUMENT_UNLOCK' : (plan ? 'SUBSCRIPTION_PURCHASE' : 'WALLET_RECHARGE')),
        docId: docId || null,
        plan: plan || null,
        status: 'SUCCESS',
        gateway: 'Money Fusion',
        createdAt: now,
        rawPayload: body
      }, { merge: true });
    } catch (_tErr) {
      console.error("[Webhook] Erreur enregistrement transaction:", _tErr);
    }

    return res.status(200).json({ success: true, message: "Webhook traité avec succès" });
  } catch (error: any) {
    console.error("[Webhook Error]:", error);
    return res.status(500).json({ error: error?.message || 'Erreur serveur webhook' });
  }
}

export async function POST(req: any) {
  try {
    let body: any = {};
    if (typeof req.json === 'function') {
      body = await req.json();
    } else {
      body = req.body || {};
    }

    let resultStatus = 200;
    let resultPayload: any = { success: true };

    const mockRes = {
      status: (code: number) => {
        resultStatus = code;
        return {
          json: (data: any) => {
            resultPayload = data;
            return data;
          }
        };
      }
    };

    await handler({ method: 'POST', body }, mockRes);

    return new Response(JSON.stringify(resultPayload), {
      status: resultStatus,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error("[Webhook Money Fusion POST error]:", err);
    return new Response(JSON.stringify({ error: err?.message || 'Erreur interne webhook' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
