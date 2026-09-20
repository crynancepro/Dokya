import { NextResponse } from 'next/server';
import { db, FieldValue } from '../../../../lib/firebaseAdmin.js';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("=== WEBHOOK MONEY FUSION REÇU ===", JSON.stringify(body));

    const personalInfo = Array.isArray(body.personal_Info)
      ? (body.personal_Info[0] || {})
      : (body.personal_Info || {});
    
    let transactionId = String(body.transactionId || personalInfo.transactionId || '').trim();
    const token = String(body.token || body.orderId || body.id || '').trim();
    let userId = String(personalInfo.userId || body.userId || '').trim();
    let userEmail = String(personalInfo.userEmail || personalInfo.email || body.email || '').trim();
    let userName = String(personalInfo.userName || personalInfo.nom || body.nomclient || '').trim();
    let phoneNumber = String(body.numeroSend || personalInfo.phoneNumber || personalInfo.userPhone || '').trim();
    let rawAmount = Number(body.totalPrice || body.amount || personalInfo.amount || 0);

    const searchId = transactionId || token;
    let existingTx = null;

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
      console.warn(`[App Webhook Route] ATTENTION: Montant 0 FCFA. Aucun crédit ne sera effectué.`);
      return NextResponse.json({ status: "ignored_zero_amount" }, { status: 200 });
    }

    const now = new Date().toISOString();
    const resolvedTxId = transactionId || token || `MF-${Date.now()}`;

    // A. Rechargement du solde de l'utilisateur
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
      console.log(`[App Webhook Route] Solde de ${userId} crédité de +${numericAmount} FCFA`);
    }

    // B. Mise à jour de la transaction correspondante dans 'transactions' avec status: 'SUCCESS'
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
      console.log(`[App Webhook Route] Transaction ${resolvedTxId} mise à jour à SUCCESS (${numericAmount} FCFA)`);
    }

    return NextResponse.json({ status: "success", amount: numericAmount, transactionId: resolvedTxId }, { status: 200 });

  } catch (error) {
    console.error("[App Webhook Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
