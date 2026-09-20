import { db, FieldValue } from '../../lib/firebaseAdmin.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const body = req.body || {};
    console.log("[Money Fusion Webhook Handler] Payload reçu:", JSON.stringify(body));

    const personalInfo = Array.isArray(body.personal_Info) ? (body.personal_Info[0] || {}) : (body.personal_Info || {});
    const metadata = body.metadata || body.customData || {};

    let transactionId = String(body.transactionId || personalInfo.transactionId || metadata.transactionId || '').trim();
    const token = String(body.token || body.orderId || body.id || '').trim();
    let userId = String(personalInfo.userId || body.userId || metadata.userId || '').trim();
    let userEmail = String(personalInfo.userEmail || personalInfo.email || body.email || metadata.userEmail || '').trim();
    let userName = String(personalInfo.userName || personalInfo.nom || body.nomclient || '').trim();
    let phoneNumber = String(body.numeroSend || personalInfo.phoneNumber || personalInfo.userPhone || personalInfo.telephone || '').trim();

    let rawAmount = Number(body.totalPrice || body.amount || personalInfo.amount || metadata.amount || 0);

    const searchId = transactionId || token;
    let existingTx: any = null;

    if (searchId && db && typeof db.collection === 'function') {
      try {
        const snap = await db.collection('transactions').doc(searchId).get();
        if (snap.exists) {
          existingTx = snap.data();
          transactionId = searchId;
        }
      } catch (_e) {}

      if (!existingTx) {
        try {
          const qSnap = await db.collection('transactions').where('transactionId', '==', searchId).limit(1).get();
          if (!qSnap.empty) {
            existingTx = qSnap.docs[0].data();
            transactionId = qSnap.docs[0].id;
          }
        } catch (_e) {}
      }
    }

    if (existingTx) {
      if (!userId || userId === 'guest') userId = existingTx.userId || userId;
      if (!userEmail) userEmail = existingTx.userEmail || userEmail;
      if (!userName || userName === 'Client Dokya' || userName === 'Utilisateur') userName = existingTx.userName || userName;
      if (!phoneNumber) phoneNumber = existingTx.phoneNumber || existingTx.userPhone || phoneNumber;
      if (rawAmount <= 0 && existingTx.amount) rawAmount = Number(existingTx.amount);
      if (rawAmount <= 0 && existingTx.expectedAmount) rawAmount = Number(existingTx.expectedAmount);
    }

    // Règle stricte : Ne crédite JAMAIS 0 FCFA
    const numericAmount = Math.round(Number(rawAmount) || 0);
    if (numericAmount <= 0) {
      console.warn(`[Money Fusion Webhook] ATTENTION: Montant détecté à 0 FCFA. Aucun crédit ne sera effectué à 0 FCFA.`);
      return res.status(200).json({ status: "ignored_zero_amount" });
    }

    const rawStatus = body.statut ?? body.status ?? body.event ?? '';
    const statusVal = String(rawStatus).toLowerCase();
    const isSuccess = statusVal === 'true' || statusVal === 'success' || statusVal === 'paid' || statusVal === 'completed' || statusVal === 'approved' || rawStatus === true || rawStatus === 1 || !rawStatus;

    if (!isSuccess && (statusVal === 'cancel' || statusVal === 'failed' || statusVal === 'refused' || statusVal === 'false')) {
      console.log(`[Money Fusion Webhook] Statut annulé/échoué (${statusVal}), aucun crédit.`);
      if (transactionId && db && typeof db.collection === 'function') {
        await db.collection('transactions').doc(transactionId).set({
          status: 'FAILED',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      return res.status(200).json({ status: "success" });
    }

    const now = new Date().toISOString();
    const resolvedTxId = transactionId || token || `MF-${Date.now()}`;

    // 1. Crédit du solde (walletBalance) de l'utilisateur
    if (userId && userId !== 'guest' && db && typeof db.collection === 'function') {
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        walletBalance: FieldValue ? FieldValue.increment(numericAmount) : numericAmount,
        balance: FieldValue ? FieldValue.increment(numericAmount) : numericAmount,
        solde: FieldValue ? FieldValue.increment(numericAmount) : numericAmount,
        lastPaymentAt: now,
        lastPaymentProvider: 'Money Fusion',
        updatedAt: now
      }, { merge: true });
      console.log(`[Webhook] Solde de l'utilisateur ${userId} crédité avec succès de +${numericAmount} FCFA`);
    }

    // 2. Mise à jour de la transaction dans 'transactions' avec status: 'SUCCESS' et le montant réel
    if (db && typeof db.collection === 'function') {
      await db.collection('transactions').doc(resolvedTxId).set({
        id: resolvedTxId,
        transactionId: resolvedTxId,
        userId: userId || 'anonymous',
        userEmail: userEmail || '',
        userName: userName || 'Utilisateur',
        phoneNumber: phoneNumber || '',
        userPhone: phoneNumber || '',
        type: 'wallet_recharge',
        amount: numericAmount,
        expectedAmount: numericAmount,
        currency: 'XOF',
        status: 'SUCCESS',
        paymentGateway: 'Money Fusion',
        paymentMethod: 'moneyfusion',
        completedAt: now,
        updatedAt: now
      }, { merge: true });
      console.log(`[Webhook] Transaction ${resolvedTxId} mise à jour à SUCCESS avec montant réel ${numericAmount} FCFA`);
    }

    return res.status(200).json({
      status: "success",
      transactionId: resolvedTxId,
      amount: numericAmount,
      userId
    });

  } catch (err: any) {
    console.error("[Webhook Error]:", err);
    return res.status(200).json({ status: "error", message: err?.message });
  }
}
